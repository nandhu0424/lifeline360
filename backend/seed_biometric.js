const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Device = require('./models/Device');
const Staff = require('./models/Staff');

dotenv.config();

const devices = [
  { device_id: "DEV01", name: "Madurai Main PHC Device", phc_id: "MDU001", district: "Madurai", status: "online" },
  { device_id: "DEV02", name: "Karupayurani PHC Device", phc_id: "MDU002", district: "Madurai", status: "online" },
  { device_id: "DEV03", name: "Silaiman PHC Device", phc_id: "MDU003", district: "Madurai", status: "online" }
];

const staffData = [
  { staff_id: "STAFF001", name: "Dr. Ravi Kumar", role: "Doctor", hospital_id: "MDU001", phc_id: "MDU001", district: "Madurai", biometric_user_id: 101, biometric_device_id: "DEV01" },
  { staff_id: "STAFF002", name: "Dr. Senthil Murugan", role: "Doctor", hospital_id: "MDU001", phc_id: "MDU001", district: "Madurai", biometric_user_id: 102, biometric_device_id: "DEV01" },
  { staff_id: "STAFF003", name: "Nurse Meena Devi", role: "Nurse", hospital_id: "MDU001", phc_id: "MDU001", district: "Madurai", biometric_user_id: 103, biometric_device_id: "DEV01" },
  { staff_id: "STAFF007", name: "Dr. Priya Darshini", role: "Doctor", hospital_id: "MDU002", phc_id: "MDU002", district: "Madurai", biometric_user_id: 101, biometric_device_id: "DEV02" },
  { staff_id: "STAFF008", name: "Nurse Kavitha R", role: "Nurse", hospital_id: "MDU002", phc_id: "MDU002", district: "Madurai", biometric_user_id: 102, biometric_device_id: "DEV02" }
];

const seedBiometric = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Seed Devices
    console.log('Cleaning Devices collection and indexes...');
    try {
      await mongoose.connection.db.dropCollection('devices');
      console.log('Collection dropped to clear stale indexes.');
    } catch (e) {
      console.log('Collection does not exist, skipping drop.');
    }

    console.log('Seeding Devices...');
    await Device.insertMany(devices);
    console.log('Devices seeded!');

    // Seed/Update Staff
    console.log('Updating Staff with Biometric Mappings...');
    for (const data of staffData) {
      await Staff.findOneAndUpdate(
        { staff_id: data.staff_id },
        { $set: data },
        { upsert: true, new: true }
      );
    }
    console.log('Staff biometric data seeded!');

    process.exit();
  } catch (error) {
    console.error('Error seeding biometric data:', error);
    process.exit(1);
  }
};

seedBiometric();
