require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Attendance = require('../models/Attendance');

const today = new Date().toISOString().split('T')[0];

const run = async () => {
  await connectDB();
  const result = await Attendance.deleteMany({ staff_id: 'MDU008-ST-002', date: today });
  console.log(`✅ Deleted ${result.deletedCount} attendance record(s) for MDU008-ST-002 on ${today}`);
  mongoose.connection.close();
};

run().catch(console.error);
