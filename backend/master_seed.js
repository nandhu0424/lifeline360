const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Models
const Hospital = require('./models/Hospital');
const PHCUser = require('./models/PHCUser');
const User = require('./models/User'); // DDHS Users
const Staff = require('./models/Staff');
const Device = require('./models/Device');
const Attendance = require('./models/Attendance');
const Alert = require('./models/Alert');
const Stock = require('./models/Stock');

dotenv.config();

const MASTER_DATA = {
  hospitals: [
    // Madurai District
    { hospital_id: "MDU007", name: "Thirunagar UPHC", type: "UPHC", district: "Madurai", location: { lat: 9.8821, lng: 78.0812 }, address: "Thirunagar, Madurai", staff_count: 7, status: "active" },
    { hospital_id: "MDU008", name: "Alanganallur PHC", type: "PHC", district: "Madurai", location: { lat: 10.0461, lng: 78.1408 }, address: "Alanganallur, Madurai", staff_count: 8, status: "active" },
    // Tirunelveli District
    { hospital_id: "TNV001", name: "Palayamkottai PHC", type: "UPHC", district: "Tirunelveli", location: { lat: 8.7139, lng: 77.7567 }, address: "Palayamkottai, Tirunelveli", staff_count: 12, status: "active" },
    { hospital_id: "TNV002", name: "Tenkasi Main PHC", type: "PHC", district: "Tirunelveli", location: { lat: 8.9591, lng: 77.3146 }, address: "Tenkasi, Tirunelveli", staff_count: 9, status: "active" },
    // Chennai District
    { hospital_id: "CHN001", name: "Adyar UPHC", type: "UPHC", district: "Chennai", location: { lat: 13.0067, lng: 80.2578 }, address: "Adyar, Chennai", staff_count: 20, status: "active" },
    { hospital_id: "CHN002", name: "Teynampet PHC", type: "PHC", district: "Chennai", location: { lat: 13.0405, lng: 80.2503 }, address: "Teynampet, Chennai", staff_count: 15, status: "active" }
  ],
  phcUsers: [
    { hospital_id: "MDU007", district: "Madurai", password: "password123", email: "mdu007@tnhealth.org" },
    { hospital_id: "MDU008", district: "Madurai", password: "password123", email: "mdu008@tnhealth.org" },
    { hospital_id: "TNV001", district: "Tirunelveli", password: "password123", email: "tnv001@tnhealth.org" },
    { hospital_id: "TNV002", district: "Tirunelveli", password: "password123", email: "tnv002@tnhealth.org" },
    { hospital_id: "CHN001", district: "Chennai", password: "password123", email: "chn001@tnhealth.org" },
    { hospital_id: "CHN002", district: "Chennai", password: "password123", email: "chn002@tnhealth.org" }
  ],
  ddhsUsers: [
    { username: "mdu_admin", email: "mdu_admin@tnhealth.org", password: "password123", role: "DDHS", district: "Madurai", district_code: "MDU" },
    { username: "tnv_admin", email: "tnv_admin@tnhealth.org", password: "password123", role: "DDHS", district: "Tirunelveli", district_code: "TNV" },
    { username: "chn_admin", email: "chn_admin@tnhealth.org", password: "password123", role: "DDHS", district: "Chennai", district_code: "CHN" },
    { username: "cbe_admin", email: "ssowndharya487@gmail.com", password: "password123", role: "DDHS", district: "Coimbatore", district_code: "CBE" }
  ],
  staff: [
    { staff_id: "ST_MDU_01", name: "Dr. Ravi (MDU)", role: "Doctor", hospital_id: "MDU007", phc_id: "MDU007", district: "Madurai", biometric_user_id: 101, biometric_device_id: "DEV_MDU_01" },
    { staff_id: "ST_TNV_01", name: "Dr. Arul (TNV)", role: "Doctor", hospital_id: "TNV001", phc_id: "TNV001", district: "Tirunelveli", biometric_user_id: 101, biometric_device_id: "DEV_TNV_01" },
    { staff_id: "ST_CHN_01", name: "Dr. Priya (CHN)", role: "Doctor", hospital_id: "CHN001", phc_id: "CHN001", district: "Chennai", biometric_user_id: 101, biometric_device_id: "DEV_CHN_01" }
  ],
  devices: [
    { device_id: "DEV_MDU_01", name: "Scanner MDU 01", phc_id: "MDU007", district: "Madurai", status: "online" },
    { device_id: "DEV_TNV_01", name: "Scanner TNV 01", phc_id: "TNV001", district: "Tirunelveli", status: "online" },
    { device_id: "DEV_CHN_01", name: "Scanner CHN 01", phc_id: "CHN001", district: "Chennai", status: "online" }
  ]
};

const masterReset = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for Multi-District Master Reset...');

    // Exact collection names from models
    const collections = ['hospitals', 'healthcenter_users', 'users', 'staffs', 'devices', 'attendances', 'alerts', 'stocks'];
    
    for (const coll of collections) {
      try {
        await mongoose.connection.db.dropCollection(coll);
        console.log(`Dropped collection: ${coll}`);
      } catch (e) {
        // Collection might not exist
      }
    }

    console.log('\n--- Seeding Multi-District Data ---');

    // 1. Hospitals
    await Hospital.insertMany(MASTER_DATA.hospitals);
    console.log('Hospitals seeded.');

    // 2. PHC Users (one by one to trigger save hooks for hashing)
    for (const u of MASTER_DATA.phcUsers) {
      await new PHCUser(u).save();
    }
    console.log('PHC Users seeded.');

    // 3. DDHS Users (one by one to trigger save hooks)
    for (const u of MASTER_DATA.ddhsUsers) {
      await new User(u).save();
    }
    console.log('DDHS Admin Users seeded.');

    // 4. Staff
    await Staff.insertMany(MASTER_DATA.staff);
    console.log('Staff records seeded.');

    // 5. Devices
    await Device.insertMany(MASTER_DATA.devices);
    console.log('Biometric Devices seeded.');

    // 6. Stocks (Flattened as per model)
    const stockData = [];
    MASTER_DATA.hospitals.forEach(h => {
      stockData.push({
        hospital_id: h.hospital_id,
        district: h.district,
        medicine_name: 'Paracetamol',
        opening_stock: 1000,
        closing_stock: 500,
        minimum_threshold: 100
      });
      stockData.push({
        hospital_id: h.hospital_id,
        district: h.district,
        medicine_name: 'Amoxicillin',
        opening_stock: 500,
        closing_stock: 80,
        minimum_threshold: 100
      });
    });
    await Stock.insertMany(stockData);
    console.log('Stock data seeded for all hospitals.');

    console.log('\n✅ Multi-District Database Master Reset Successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Master Reset Failed:', error);
    process.exit(1);
  }
};

masterReset();
