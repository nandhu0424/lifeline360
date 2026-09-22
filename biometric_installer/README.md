# Lifeline360 — Biometric Sync Installer

A standalone Windows service that reads fingerprint attendance logs from a local MySQL database, converts them to secure JSON packages, and transmits them to the Lifeline360 central server automatically every 5 seconds.

---

## Folder Structure

```
biometric_installer/
├── sync_agent.js     ← Core agent (compiled into .exe)
├── config.json       ← Edit this with your MySQL credentials
├── build.js          ← Run this to generate the .exe file
├── package.json      ← Dependencies
└── dist/             ← After build: sync_installer.exe + config.json
```

---

## Step 1 — Install Dependencies & Build the .exe

Open a Command Prompt inside this folder and run:

```bash
npm install
node build.js
```

This will produce:
```
dist/
├── sync_installer.exe   ← Deploy this to the clinic local server
└── config.json          ← Deploy this alongside the .exe
```

---

## Step 2 — Configure the Installer

Open `dist/config.json` and fill in:

```json
{
  "mysql": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "YOUR_MYSQL_PASSWORD_HERE",
    "database": "biometric_db"
  },
  "cloud": {
    "url": "http://YOUR-SERVER-IP:5000/api/attendance/secure-push",
    "secret": "lifeline360_secure_sync_secret"
  },
  "sync_interval_seconds": 5
}
```

---

## Step 3 — Set Up the Local MySQL Database

On the clinic's MySQL server, run:

```sql
CREATE DATABASE IF NOT EXISTS biometric_db;
USE biometric_db;

CREATE TABLE IF NOT EXISTS attendance_logs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  device_id         VARCHAR(50)   NOT NULL,
  biometric_user_id INT           NOT NULL,
  log_type          ENUM('check_in', 'check_out') NOT NULL DEFAULT 'check_in',
  scan_time         VARCHAR(10)   NOT NULL COMMENT 'HH:MM:SS in 24h format',
  scan_date         DATE          NOT NULL,
  staff_id          VARCHAR(50),
  staff_name        VARCHAR(100),
  hospital_id       VARCHAR(50),
  synced            TINYINT(1)    NOT NULL DEFAULT 0,
  synced_at         DATETIME,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
```

The fingerprint scanner software writes to this table. The `synced` column is managed by the installer automatically.

---

## Step 4 — Deploy & Run on Local Server

1. Copy `dist/sync_installer.exe` and `dist/config.json` to the clinic server.
2. Double-click `sync_installer.exe` (or run via Command Prompt).
3. The agent will start and log all activity to the console.

**To run as a background Windows Service (24/7), use NSSM:**
```
nssm install Lifeline360SyncAgent "C:\path\to\sync_installer.exe"
nssm start Lifeline360SyncAgent
```

---

## How It Works

```
Fingerprint → MySQL (synced=0)
                    ↓
           [sync_installer.exe]
           Reads rows every 5s
           Converts to JSON
           Encrypts with AES-256
           Sends to Cloud Server
                    ↓
           Cloud Server decrypts
           Records Attendance in MongoDB
                    ↓
           MySQL rows updated (synced=1)
```

---

## Security

- All data is encrypted with **AES-256-CBC** before transmission.
- The `secret` in `config.json` must match the `SYNC_SECRET` environment variable on the central server.
- No Aadhar or sensitive patient data is transmitted — only: `device_id`, `user_id`, `log_type`, `scan_time`, `scan_date`.
