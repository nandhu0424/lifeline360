/**
 * =================================================================
 * Lifeline360 — Biometric Sync Agent (sync_agent.js)
 * =================================================================
 * This agent runs 24/7 on the clinic's local server.
 * It:
 *   1. Connects to the local MySQL database
 *   2. Fetches unsynced attendance logs every N seconds
 *   3. Converts them to JSON format
 *   4. Encrypts the JSON payload using AES-256-CBC
 *   5. Sends the encrypted package to the central cloud server
 *   6. Marks successfully synced records in MySQL
 * =================================================================
 */

'use strict';

const mysql  = require('mysql2/promise');
const axios  = require('axios');
const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs');

// ── Load Config ───────────────────────────────────────────────────
// When compiled with pkg, __dirname points to the .exe location
const configPath = path.join(process.execPath ? path.dirname(process.execPath) : __dirname, 'config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error('[FATAL] Cannot read config.json:', err.message);
  console.error('[FATAL] Make sure config.json is in the same folder as sync_installer.exe');
  process.exit(1);
}

const { mysql: mysqlConfig, cloud: cloudConfig, sync_interval_seconds = 5 } = config;

// ── AES-256-CBC Encrypt ───────────────────────────────────────────
function encryptPayload(jsonData, secretKey) {
  const key = crypto.createHash('sha256').update(secretKey).digest(); // 32-byte key
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(jsonData), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// ── Logger ────────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${msg}`);
}

// ── Create MySQL Table (if it doesn't exist) ──────────────────────
async function ensureTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      device_id       VARCHAR(50)  NOT NULL,
      biometric_user_id INT        NOT NULL,
      log_type        ENUM('check_in', 'check_out') NOT NULL DEFAULT 'check_in',
      scan_time       VARCHAR(10)  NOT NULL COMMENT 'HH:MM:SS in 24h format',
      scan_date       DATE         NOT NULL,
      staff_id        VARCHAR(50),
      staff_name      VARCHAR(100),
      hospital_id     VARCHAR(50),
      synced          TINYINT(1)   NOT NULL DEFAULT 0,
      synced_at       DATETIME,
      created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    )
  `);
  log('MySQL table attendance_logs verified/created.');
}

// ── Main Sync Loop ────────────────────────────────────────────────
async function runSyncLoop() {
  log('=== Lifeline360 Biometric Sync Agent Starting ===');
  log(`MySQL Host: ${mysqlConfig.host}:${mysqlConfig.port}  DB: ${mysqlConfig.database}`);
  log(`Cloud Server: ${cloudConfig.url}`);
  log(`Sync Interval: ${sync_interval_seconds}s`);
  log('=================================================');

  let conn;
  try {
    conn = await mysql.createConnection({
      host:     mysqlConfig.host,
      port:     mysqlConfig.port,
      user:     mysqlConfig.user,
      password: mysqlConfig.password,
      database: mysqlConfig.database
    });
    log('MySQL connection established.');
    await ensureTable(conn);
  } catch (err) {
    log(`[FATAL] Cannot connect to MySQL: ${err.message}`, 'ERROR');
    process.exit(1);
  }

  // ── Sync Tick ──────────────────────────────────────────────────
  async function tick() {
    try {
      // Step 1: Fetch unsynced logs
      const [rows] = await conn.execute(
        `SELECT 
           id, 
           device_id, 
           biometric_user_id  AS user_id, 
           log_type, 
           scan_time          AS time, 
           DATE_FORMAT(scan_date, '%Y-%m-%d') AS date,
           staff_id,
           staff_name,
           hospital_id
         FROM attendance_logs 
         WHERE synced = 0 
         ORDER BY scan_date ASC, scan_time ASC
         LIMIT 50`
      );

      if (rows.length === 0) {
        return; // Nothing to sync
      }

      log(`Found ${rows.length} unsynced record(s). Preparing sync...`);

      // Step 2: Convert SQL rows to clean JSON format
      const jsonLogs = rows.map(row => ({
        id:        row.id,
        device_id: row.device_id,
        user_id:   row.user_id,
        log_type:  row.log_type,
        time:      row.time,
        date:      row.date,
        staff_id:  row.staff_id   || null,
        staff_name:row.staff_name || null,
        hospital_id: row.hospital_id || null
      }));

      log(`JSON payload prepared (${jsonLogs.length} records).`);

      // Step 3: Encrypt the JSON payload
      const encryptedPayload = encryptPayload(jsonLogs, cloudConfig.secret);

      // Step 4: Send to Cloud Server
      const response = await axios.post(
        cloudConfig.url,
        { payload: encryptedPayload },
        {
          headers:  { 'Content-Type': 'application/json' },
          timeout:  15000  // 15 second timeout
        }
      );

      const result = response.data;

      if (result.success) {
        const syncedIds = result.synced || [];
        const failedIds = result.failed || [];

        log(`Sync response: ${syncedIds.length} synced, ${failedIds.length} failed.`);

        if (failedIds.length > 0) {
          failedIds.forEach(f => log(`  Failed ID ${f.id}: ${f.error}`, 'WARN'));
        }

        // Step 5: Mark successfully synced records in MySQL
        if (syncedIds.length > 0) {
          const placeholders = syncedIds.map(() => '?').join(',');
          await conn.execute(
            `UPDATE attendance_logs 
             SET synced = 1, synced_at = NOW() 
             WHERE id IN (${placeholders})`,
            syncedIds
          );
          log(`Marked ${syncedIds.length} records as synced in MySQL.`);
        }
      } else {
        log(`Cloud server returned failure: ${result.message}`, 'WARN');
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED') {
        log(`Cloud server unreachable. Will retry in ${sync_interval_seconds}s.`, 'WARN');
      } else if (err.code === 'ETIMEDOUT') {
        log(`Request timed out. Will retry in ${sync_interval_seconds}s.`, 'WARN');
      } else {
        log(`Sync error: ${err.message}`, 'ERROR');
      }
    }
  }

  // ── Run continuously ───────────────────────────────────────────
  log(`Agent running. Press Ctrl+C to stop.`);
  await tick(); // Run immediately on start
  setInterval(tick, sync_interval_seconds * 1000);
}

// ── Entry point ───────────────────────────────────────────────────
runSyncLoop().catch(err => {
  console.error('[FATAL] Unhandled error:', err);
  process.exit(1);
});
