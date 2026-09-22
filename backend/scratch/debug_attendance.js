require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');

const today = new Date().toISOString().split('T')[0];

const run = async () => {
  await connectDB();

  // Find Dr. Arjun Chettiar
  const staff = await Staff.findOne({ staff_id: 'MDU008-ST-002' });
  if (!staff) {
    console.log('❌ Staff not found with ID MDU008-ST-002. Listing all MDU008 staff...');
    const all = await Staff.find({ hospital_id: 'MDU008' });
    all.forEach(s => console.log(' -', s.staff_id, s.name, '| shift_start:', s.shift_start, '| weekly_schedule:', JSON.stringify(s.weekly_schedule)));
  } else {
    console.log('\n✅ Staff found:', staff.name);
    console.log('  shift_start:', staff.shift_start);
    console.log('  shift_end:', staff.shift_end);
    console.log('  weekly_schedule (monday):', JSON.stringify(staff.weekly_schedule?.monday));
    console.log('  weekly_schedule (full):', JSON.stringify(staff.weekly_schedule, null, 2));
  }

  // Find today's attendance record
  const att = await Attendance.findOne({ staff_id: 'MDU008-ST-002', date: today });
  if (att) {
    console.log('\n📋 Today\'s Attendance:');
    console.log('  check_in_time:', att.check_in_time);
    console.log('  status:', att.status);
    console.log('  is_late:', att.is_late);
    console.log('  late_minutes:', att.late_minutes);
  } else {
    console.log('\n📋 No attendance record for today');
  }

  mongoose.connection.close();
};

run().catch(console.error);
