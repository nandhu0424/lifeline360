const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Staff = require('../models/Staff');
const Hospital = require('../models/Hospital');
const Device = require('../models/Device');

dotenv.config();

const updateStaffBiometric = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all hospitals
    const hospitals = await Hospital.find();
    console.log(`Found ${hospitals.length} hospitals`);

    for (const hospital of hospitals) {
      const hospital_id = hospital.hospital_id;
      const device_id = `BIO-${hospital_id}`;

      // 1. Ensure Device exists for this hospital
      let device = await Device.findOne({ phc_id: hospital_id });
      if (!device) {
        device = new Device({
          device_id: device_id,
          name: `Biometric Device - ${hospital.name}`,
          phc_id: hospital_id,
          district: hospital.district,
          status: 'online'
        });
        await device.save();
        console.log(`Created device ${device_id} for ${hospital.name}`);
      } else {
        // Update device_id to match our pattern if needed
        device.device_id = device_id;
        await device.save();
      }

      // 2. Get all staff for this hospital
      const staffList = await Staff.find({ hospital_id });
      console.log(`Updating ${staffList.length} staff for ${hospital.name}`);

      let userIdCounter = 101;
      for (const staff of staffList) {
        staff.biometric_user_id = userIdCounter++;
        staff.biometric_device_id = device_id;
        await staff.save();
      }
    }

    console.log('Successfully updated all staff with biometric IDs');
    process.exit(0);
  } catch (error) {
    console.error('Error updating staff biometric:', error);
    process.exit(1);
  }
};

updateStaffBiometric();
