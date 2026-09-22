require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const PHCUser = require('../models/PHCUser');
const Staff = require('../models/Staff');
const Device = require('../models/Device');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('=== HOSPITALS ===');
  const hospitals = await Hospital.find({}).select('hospital_id name type district staff_count');
  hospitals.forEach(x => console.log(JSON.stringify({ id: x.hospital_id, name: x.name, type: x.type, district: x.district, staff_count: x.staff_count })));

  console.log('\n=== PHC USERS (healthcenter_users) ===');
  const phcUsers = await PHCUser.find({}).select('hospital_id district email');
  phcUsers.forEach(x => console.log(JSON.stringify({ hid: x.hospital_id, district: x.district, email: x.email })));

  console.log('\n=== DDHS USERS ===');
  const users = await User.find({}).select('username district district_code role');
  users.forEach(x => console.log(JSON.stringify({ user: x.username, district: x.district, code: x.district_code, role: x.role })));

  console.log('\n=== DEVICES ===');
  const devices = await Device.find({}).select('device_id phc_id district');
  devices.forEach(x => console.log(JSON.stringify({ dev: x.device_id, phc: x.phc_id, district: x.district })));

  console.log('\n=== STAFF WITH BIOMETRIC MAPPING ===');
  const bioStaff = await Staff.find({ biometric_user_id: { $exists: true, $ne: null } }).select('staff_id name hospital_id biometric_user_id biometric_device_id');
  bioStaff.forEach(x => console.log(JSON.stringify({ sid: x.staff_id, name: x.name, hid: x.hospital_id, bio_uid: x.biometric_user_id, bio_dev: x.biometric_device_id })));

  console.log('\n=== STAFF COUNT BY HOSPITAL ===');
  const staffAgg = await Staff.aggregate([{ $group: { _id: '$hospital_id', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  staffAgg.forEach(x => console.log(JSON.stringify(x)));

  console.log('\n=== HOSPITAL staff_count vs ACTUAL STAFF ===');
  for (const h of hospitals) {
    const actualCount = await Staff.countDocuments({ hospital_id: h.hospital_id });
    const match = h.staff_count === actualCount ? '✅' : '❌ MISMATCH';
    console.log(`${h.hospital_id}: declared=${h.staff_count}, actual=${actualCount} ${match}`);
  }

  console.log('\n=== PHC USERS WITHOUT MATCHING HOSPITAL ===');
  for (const p of phcUsers) {
    const hExists = await Hospital.findOne({ hospital_id: p.hospital_id });
    if (!hExists) console.log(`❌ PHCUser ${p.hospital_id} has NO matching hospital!`);
  }

  console.log('\n=== DEVICES WITHOUT MATCHING HOSPITAL ===');
  for (const d of devices) {
    const hExists = await Hospital.findOne({ hospital_id: d.phc_id });
    if (!hExists) console.log(`❌ Device ${d.device_id} points to phc_id=${d.phc_id} which has NO matching hospital!`);
    else console.log(`✅ Device ${d.device_id} -> ${d.phc_id}`);
  }

  console.log('\n=== BIOMETRIC STAFF WITHOUT MATCHING DEVICE ===');
  for (const s of bioStaff) {
    const devExists = await Device.findOne({ device_id: s.biometric_device_id });
    if (!devExists) console.log(`❌ Staff ${s.staff_id} (${s.name}) mapped to device ${s.biometric_device_id} which DOES NOT EXIST`);
    else console.log(`✅ Staff ${s.staff_id} -> Device ${s.biometric_device_id}`);
  }

  console.log('\n=== ATTENDANCE RECORDS ===');
  const attCount = await Attendance.countDocuments();
  console.log(`Total attendance records: ${attCount}`);

  const attBySource = await Attendance.aggregate([{ $group: { _id: '$source', count: { $sum: 1 } } }]);
  console.log('By source:', JSON.stringify(attBySource));

  const attOrphans = await Attendance.aggregate([
    { $lookup: { from: 'staffs', localField: 'staff_id', foreignField: 'staff_id', as: 'staff_match' } },
    { $match: { staff_match: { $size: 0 } } },
    { $count: 'orphaned_records' }
  ]);
  console.log('Orphaned attendance (no matching staff):', JSON.stringify(attOrphans));

  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
