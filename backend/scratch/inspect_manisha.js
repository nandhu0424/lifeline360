require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Database connected');

  const today = new Date().toISOString().split('T')[0];
  console.log('Today date:', today);

  const records = await Attendance.find({ staff_id: 'NRL_CBE001_06', date: today });
  console.log('Manisha today attendance records:', records);

  if (records.length > 0) {
    const result = await Attendance.deleteMany({ staff_id: 'NRL_CBE001_06', date: today });
    console.log('Deleted records:', result);
  }

  mongoose.connection.close();
}

run();
