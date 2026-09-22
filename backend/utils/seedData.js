require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const Patient = require('../models/Patient');
const Stock = require('../models/Stock');
const Alert = require('../models/Alert');
const DiseaseCase = require('../models/DiseaseCase');

const connectDB = require('../config/db');

const today = new Date().toISOString().split('T')[0];
const getDateBefore = (days) => {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const generateWeeklySchedule = (type, start, end) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = {};
  days.forEach(day => {
    // Weekend logic: Saturday could be half day, Sunday off
    if (day === 'sunday') {
      schedule[day] = { shift_type: 'Off', shift_start: '--:--', shift_end: '--:--' };
    } else if (day === 'saturday') {
      schedule[day] = { shift_type: 'Day', shift_start: '09:00 AM', shift_end: '01:00 PM' };
    } else {
      schedule[day] = { shift_type: type, shift_start: start, shift_end: end };
    }
  });
  return schedule;
};

// ─── USERS ───────────────────────────────────────────────────────────────────
const users = [
  { username: 'ddhs_madurai', password: 'madurai123', email: 'ddhs_madurai@gmail.com', mobile: '9876543201', district: 'Madurai', district_code: 'MDU01', role: 'DDHS' },
  { username: 'ddhs_tirunelveli', password: 'tirunelveli123', email: 'ddhs.tirunelveli@tn.gov.in', mobile: '9876543202', district: 'Tirunelveli', district_code: 'TNV01', role: 'DDHS' },
  { username: 'ddhs_chennai', password: 'chennai123', email: 'ddhs.chennai@tn.gov.in', mobile: '9876543203', district: 'Chennai', district_code: 'CHN01', role: 'DDHS' },
  { username: 'ddhs_coimbatore', password: 'coimbatore123', email: 'ssowndharya487@gmail.com', mobile: '9876543204', district: 'Coimbatore', district_code: 'CBE01', role: 'DDHS' }
];


// ─── HOSPITALS (Madurai) ──────────────────────────────────────────────────────
const hospitals = [
  { hospital_id: 'MDU001', name: 'Madurai Main PHC', type: 'PHC', district: 'Madurai', location: { lat: 9.9252, lng: 78.1198 }, address: 'Madurai Main Road, Madurai', staff_count: 6, contact: '0452-2345001', status: 'active' },
  { hospital_id: 'MDU002', name: 'Karupayurani PHC', type: 'PHC', district: 'Madurai', location: { lat: 9.9152, lng: 78.1098 }, address: 'Karupayurani, Madurai', staff_count: 5, contact: '0452-2345002', status: 'active' },
  { hospital_id: 'MDU003', name: 'Silaiman PHC', type: 'PHC', district: 'Madurai', location: { lat: 9.9352, lng: 78.1298 }, address: 'Silaiman, Madurai', staff_count: 5, contact: '0452-2345003', status: 'active' },
  { hospital_id: 'MDU004', name: 'Ushilampatti PHC', type: 'PHC', district: 'Madurai', location: { lat: 9.9052, lng: 78.1398 }, address: 'Ushilampatti, Madurai', staff_count: 5, contact: '0452-2345004', status: 'active' },
  { hospital_id: 'MDU005', name: 'Palamedu PHC', type: 'PHC', district: 'Madurai', location: { lat: 9.8952, lng: 78.1498 }, address: 'Palamedu, Madurai', staff_count: 5, contact: '0452-2345005', status: 'active' },
  { hospital_id: 'MDU006', name: 'Madurai Urban PHC', type: 'UPHC', district: 'Madurai', location: { lat: 9.9452, lng: 78.1598 }, address: 'Urban Area, Madurai', staff_count: 8, contact: '0452-2345006', status: 'active' },
  { hospital_id: 'MDU007', name: 'Thirunagar UPHC', type: 'UPHC', district: 'Madurai', location: { lat: 9.9552, lng: 78.1698 }, address: 'Thirunagar, Madurai', staff_count: 7, contact: '0452-2345007', status: 'active' },
  { hospital_id: 'MDU008', name: 'Alanganallur Sub Centre', type: 'SUB_CENTRE', district: 'Madurai', location: { lat: 9.9652, lng: 78.1798 }, address: 'Alanganallur, Madurai', staff_count: 2, contact: '0452-2345008', status: 'active' },
  { hospital_id: 'MDU009', name: 'Kottampatti Sub Centre', type: 'SUB_CENTRE', district: 'Madurai', location: { lat: 9.9752, lng: 78.1898 }, address: 'Kottampatti, Madurai', staff_count: 2, contact: '0452-2345009', status: 'active' },
  { hospital_id: 'MDU010', name: 'Tirumangalam Sub Centre', type: 'SUB_CENTRE', district: 'Madurai', location: { lat: 9.9852, lng: 78.1998 }, address: 'Tirumangalam, Madurai', staff_count: 2, contact: '0452-2345010', status: 'active' }
];

// ─── STAFF (for MDU001 - MDU007) ──────────────────────────────────────────────
const staffList = [
  // MDU001 - Madurai Main PHC
  { staff_id: 'STAFF001', name: 'Dr. Ravi Kumar', role: 'Doctor', hospital_id: 'MDU001', district: 'Madurai', mobile: '9876543210', email: 'ravi.kumar@phc.tn.gov.in', biometric_id: 'BIO001', shift_type: 'Day', shift_start: '09:00 AM', shift_end: '05:00 PM', weekly_schedule: generateWeeklySchedule('Day', '09:00 AM', '05:00 PM') },
  { staff_id: 'STAFF002', name: 'Dr. Senthil Murugan', role: 'Doctor', hospital_id: 'MDU001', district: 'Madurai', mobile: '9876543211', email: 'senthil.m@phc.tn.gov.in', biometric_id: 'BIO002', shift_type: 'Day', shift_start: '09:00 AM', shift_end: '05:00 PM', weekly_schedule: generateWeeklySchedule('Day', '09:00 AM', '05:00 PM') },
  { staff_id: 'STAFF003', name: 'Nurse Meena Devi', role: 'Nurse', hospital_id: 'MDU001', district: 'Madurai', mobile: '9876543212', email: 'meena.d@phc.tn.gov.in', biometric_id: 'BIO003', shift_type: 'Day', shift_start: '08:00 AM', shift_end: '04:00 PM', weekly_schedule: generateWeeklySchedule('Day', '08:00 AM', '04:00 PM') },
  { staff_id: 'STAFF004', name: 'Nurse Sita Lakshmi', role: 'Nurse', hospital_id: 'MDU001', district: 'Madurai', mobile: '9876543213', email: 'sita.l@phc.tn.gov.in', biometric_id: 'BIO004', shift_type: 'Day', shift_start: '08:00 AM', shift_end: '04:00 PM', weekly_schedule: generateWeeklySchedule('Day', '08:00 AM', '04:00 PM') },
  { staff_id: 'STAFF005', name: 'Lab Tech Anand Kumar', role: 'LabTech', hospital_id: 'MDU001', district: 'Madurai', mobile: '9876543214', email: 'anand.k@phc.tn.gov.in', biometric_id: 'BIO005', shift_type: 'Night', shift_start: '08:00 PM', shift_end: '08:00 AM', weekly_schedule: generateWeeklySchedule('Night', '08:00 PM', '08:00 AM') },
  { staff_id: 'STAFF006', name: 'ANM Lakshmi Priya', role: 'ANM', hospital_id: 'MDU001', district: 'Madurai', mobile: '9876543215', email: 'lakshmi.p@phc.tn.gov.in', biometric_id: 'BIO006', shift_type: 'Day', shift_start: '08:00 AM', shift_end: '04:00 PM', weekly_schedule: generateWeeklySchedule('Day', '08:00 AM', '04:00 PM') },
  // MDU002 - Karupayurani
  { staff_id: 'STAFF007', name: 'Dr. Priya Darshini', role: 'Doctor', hospital_id: 'MDU002', district: 'Madurai', mobile: '9876543216', email: 'priya.d@phc.tn.gov.in', biometric_id: 'BIO007', shift_type: 'Day', shift_start: '09:00 AM', shift_end: '05:00 PM', weekly_schedule: generateWeeklySchedule('Day', '09:00 AM', '05:00 PM') },
  { staff_id: 'STAFF008', name: 'Nurse Kavitha R', role: 'Nurse', hospital_id: 'MDU002', district: 'Madurai', mobile: '9876543217', email: 'kavitha.r@phc.tn.gov.in', biometric_id: 'BIO008', shift_type: 'Day', shift_start: '08:00 AM', shift_end: '04:00 PM', weekly_schedule: generateWeeklySchedule('Day', '08:00 AM', '04:00 PM') },
  { staff_id: 'STAFF009', name: 'Lab Tech Suresh P', role: 'LabTech', hospital_id: 'MDU002', district: 'Madurai', mobile: '9876543218', email: 'suresh.p@phc.tn.gov.in', biometric_id: 'BIO009', shift_type: 'Day', shift_start: '09:00 AM', shift_end: '05:00 PM', weekly_schedule: generateWeeklySchedule('Day', '09:00 AM', '05:00 PM') },
  // MDU006 - Madurai Urban UPHC
  { staff_id: 'STAFF010', name: 'Dr. Rajesh Kannan', role: 'Doctor', hospital_id: 'MDU006', district: 'Madurai', mobile: '9876543219', email: 'rajesh.k@uphc.tn.gov.in', biometric_id: 'BIO010', shift_type: 'Day', shift_start: '09:00 AM', shift_end: '05:00 PM', weekly_schedule: generateWeeklySchedule('Day', '09:00 AM', '05:00 PM') },
  { staff_id: 'STAFF011', name: 'Dr. Anitha Selvi', role: 'Doctor', hospital_id: 'MDU006', district: 'Madurai', mobile: '9876543220', email: 'anitha.s@uphc.tn.gov.in', biometric_id: 'BIO011', shift_type: 'Day', shift_start: '09:00 AM', shift_end: '05:00 PM', weekly_schedule: generateWeeklySchedule('Day', '09:00 AM', '05:00 PM') },
  { staff_id: 'STAFF012', name: 'Nurse Chitra V', role: 'Nurse', hospital_id: 'MDU006', district: 'Madurai', mobile: '9876543221', email: 'chitra.v@uphc.tn.gov.in', biometric_id: 'BIO012', shift_type: 'Night', shift_start: '09:00 PM', shift_end: '06:00 AM', weekly_schedule: generateWeeklySchedule('Night', '09:00 PM', '06:00 AM') },
];

// ─── ATTENDANCE (Today) ───────────────────────────────────────────────────────
const attendance = [
  { staff_id: 'STAFF001', staff_name: 'Dr. Ravi Kumar', staff_role: 'Doctor', hospital_id: 'MDU001', district: 'Madurai', date: today, check_in_time: '09:00 AM', check_out_time: '05:00 PM', status: 'present', late_minutes: 0, biometric_verified: true },
  { staff_id: 'STAFF002', staff_name: 'Dr. Senthil Murugan', staff_role: 'Doctor', hospital_id: 'MDU001', district: 'Madurai', date: today, check_in_time: '10:15 AM', check_out_time: null, status: 'late', late_minutes: 75, biometric_verified: true },
  { staff_id: 'STAFF003', staff_name: 'Nurse Meena Devi', staff_role: 'Nurse', hospital_id: 'MDU001', district: 'Madurai', date: today, check_in_time: '08:45 AM', check_out_time: '04:45 PM', status: 'present', late_minutes: 0, biometric_verified: true },
  { staff_id: 'STAFF004', staff_name: 'Nurse Sita Lakshmi', staff_role: 'Nurse', hospital_id: 'MDU001', district: 'Madurai', date: today, check_in_time: null, check_out_time: null, status: 'absent', late_minutes: 0, biometric_verified: false },
  { staff_id: 'STAFF005', staff_name: 'Lab Tech Anand Kumar', staff_role: 'LabTech', hospital_id: 'MDU001', district: 'Madurai', date: today, check_in_time: '09:00 AM', check_out_time: '05:00 PM', status: 'present', late_minutes: 0, biometric_verified: true },
  { staff_id: 'STAFF006', staff_name: 'ANM Lakshmi Priya', staff_role: 'ANM', hospital_id: 'MDU001', district: 'Madurai', date: today, check_in_time: '08:30 AM', check_out_time: '04:30 PM', status: 'present', late_minutes: 0, biometric_verified: true },
  { staff_id: 'STAFF007', staff_name: 'Dr. Priya Darshini', staff_role: 'Doctor', hospital_id: 'MDU002', district: 'Madurai', date: today, check_in_time: '09:05 AM', check_out_time: '05:05 PM', status: 'present', late_minutes: 0, biometric_verified: true },
  { staff_id: 'STAFF008', staff_name: 'Nurse Kavitha R', staff_role: 'Nurse', hospital_id: 'MDU002', district: 'Madurai', date: today, check_in_time: null, check_out_time: null, status: 'absent', late_minutes: 0, biometric_verified: false },
  { staff_id: 'STAFF010', staff_name: 'Dr. Rajesh Kannan', staff_role: 'Doctor', hospital_id: 'MDU006', district: 'Madurai', date: today, check_in_time: '09:00 AM', check_out_time: null, status: 'present', late_minutes: 0, biometric_verified: true },
  { staff_id: 'STAFF011', staff_name: 'Dr. Anitha Selvi', staff_role: 'Doctor', hospital_id: 'MDU006', district: 'Madurai', date: today, check_in_time: '10:30 AM', check_out_time: null, status: 'late', late_minutes: 90, biometric_verified: true },
  { staff_id: 'STAFF012', staff_name: 'Nurse Chitra V', staff_role: 'Nurse', hospital_id: 'MDU006', district: 'Madurai', date: today, check_in_time: '08:55 AM', check_out_time: null, status: 'present', late_minutes: 0, biometric_verified: true },
];

// ─── STOCKS (MDU001) ──────────────────────────────────────────────────────────
const stocks = [
  { hospital_id: 'MDU001', district: 'Madurai', medicine_name: 'Paracetamol 500mg', opening_stock: 500, issued: 120, received: 0, closing_stock: 380, minimum_threshold: 100 },
  { hospital_id: 'MDU001', district: 'Madurai', medicine_name: 'Amoxicillin 500mg', opening_stock: 200, issued: 155, received: 0, closing_stock: 45, minimum_threshold: 50 },
  { hospital_id: 'MDU001', district: 'Madurai', medicine_name: 'Insulin 100IU', opening_stock: 50, issued: 10, received: 0, closing_stock: 40, minimum_threshold: 20 },
  { hospital_id: 'MDU001', district: 'Madurai', medicine_name: 'ORS Packets', opening_stock: 300, issued: 200, received: 0, closing_stock: 100, minimum_threshold: 50 },
  { hospital_id: 'MDU001', district: 'Madurai', medicine_name: 'Dolo 650mg', opening_stock: 150, issued: 130, received: 0, closing_stock: 20, minimum_threshold: 30 },
  { hospital_id: 'MDU001', district: 'Madurai', medicine_name: 'Metformin 500mg', opening_stock: 400, issued: 80, received: 0, closing_stock: 320, minimum_threshold: 80 },
  { hospital_id: 'MDU002', district: 'Madurai', medicine_name: 'Paracetamol 500mg', opening_stock: 300, issued: 90, received: 0, closing_stock: 210, minimum_threshold: 80 },
  { hospital_id: 'MDU002', district: 'Madurai', medicine_name: 'Amoxicillin 500mg', opening_stock: 150, issued: 60, received: 0, closing_stock: 90, minimum_threshold: 50 },
  { hospital_id: 'MDU006', district: 'Madurai', medicine_name: 'Paracetamol 500mg', opening_stock: 600, issued: 200, received: 100, closing_stock: 500, minimum_threshold: 100 },
  { hospital_id: 'MDU006', district: 'Madurai', medicine_name: 'Ciprofloxacin 500mg', opening_stock: 100, issued: 85, received: 0, closing_stock: 15, minimum_threshold: 30 },
];

// ─── PATIENTS (OPD visits last 7 days) ───────────────────────────────────────
const patients = [];
const opdData = [68, 72, 65, 70, 45, 75, 71]; // MDU001 last 7 days
const opdData2 = [45, 48, 42, 46, 40, 50, 47]; // MDU002

opdData.forEach((count, idx) => {
  const date = getDateBefore(6 - idx);
  for (let i = 0; i < count; i++) {
    patients.push({
      patient_id: `PAT-MDU001-${date}-${i + 1}`,
      name: `Patient ${i + 1}`,
      age: 20 + (i % 50),
      gender: i % 2 === 0 ? 'Male' : 'Female',
      hospital_id: 'MDU001',
      district: 'Madurai',
      visit_date: date,
      symptoms: 'Fever, Cough',
      diagnosis: 'Viral fever',
      medicines: 'Paracetamol',
      opd_number: `OPD-MDU001-${date}-${i + 1}`
    });
  }
});

opdData2.forEach((count, idx) => {
  const date = getDateBefore(6 - idx);
  for (let i = 0; i < count; i++) {
    patients.push({
      patient_id: `PAT-MDU002-${date}-${i + 1}`,
      name: `Patient ${i + 1}`,
      age: 20 + (i % 50),
      gender: i % 2 === 0 ? 'Male' : 'Female',
      hospital_id: 'MDU002',
      district: 'Madurai',
      visit_date: date,
      symptoms: 'Headache',
      diagnosis: 'Hypertension',
      medicines: 'Amlodipine',
      opd_number: `OPD-MDU002-${date}-${i + 1}`
    });
  }
});

// ─── DISEASE CASES ────────────────────────────────────────────────────────────
const diseaseCases = [
  { hospital_id: 'MDU001', district: 'Madurai', disease_name: 'Fever', case_count: 25, usual_threshold: 10, date: today, alert_triggered: false },
  { hospital_id: 'MDU001', district: 'Madurai', disease_name: 'Dengue', case_count: 5, usual_threshold: 1, date: today, alert_triggered: false },
  { hospital_id: 'MDU001', district: 'Madurai', disease_name: 'Diarrhea', case_count: 4, usual_threshold: 3, date: today, alert_triggered: false },
  { hospital_id: 'MDU002', district: 'Madurai', disease_name: 'Malaria', case_count: 3, usual_threshold: 2, date: today, alert_triggered: false },
];

// ─── ALERTS (sample) ─────────────────────────────────────────────────────────
const alerts = [
  { alert_id: 'ALT001', hospital_id: 'MDU001', hospital_name: 'Madurai Main PHC', district: 'Madurai', type: 'absenteeism', message: 'Nurse Sita Lakshmi is absent today without prior notice at Madurai Main PHC.', severity: 'medium', status: 'sent', email_sent: true, created_at: new Date() },
  { alert_id: 'ALT002', hospital_id: 'MDU001', hospital_name: 'Madurai Main PHC', district: 'Madurai', type: 'low_stock', message: 'Amoxicillin 500mg stock is low at Madurai Main PHC. Current: 45 units (min threshold: 50).', severity: 'medium', status: 'sent', email_sent: true, created_at: new Date() },
  { alert_id: 'ALT003', hospital_id: 'MDU001', hospital_name: 'Madurai Main PHC', district: 'Madurai', type: 'low_stock', message: 'Dolo 650mg stock is critical at Madurai Main PHC. Current: 20 units (min threshold: 30).', severity: 'high', status: 'pending', email_sent: false, created_at: new Date() },
  { alert_id: 'ALT004', hospital_id: 'MDU001', hospital_name: 'Madurai Main PHC', district: 'Madurai', type: 'late_attendance', message: 'Dr. Senthil Murugan arrived late at 10:15 AM (75 mins late) at Madurai Main PHC.', severity: 'low', status: 'sent', email_sent: true, created_at: new Date() },
];


// ─── SEED FUNCTION ────────────────────────────────────────────────────────────
const seed = async () => {
  await connectDB();
  console.log('\n🌱 Starting database seed...\n');

  try {
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Hospital.deleteMany({ district: 'Madurai' }),
      Staff.deleteMany({ district: 'Madurai' }),
      Attendance.deleteMany({ district: 'Madurai' }),
      Patient.deleteMany({ district: 'Madurai' }),
      Stock.deleteMany({ district: 'Madurai' }),
      Alert.deleteMany({ district: 'Madurai' }),
      DiseaseCase.deleteMany({ district: 'Madurai' })
    ]);
    console.log('🗑️  Cleared existing seed data');

    // Seed Users (with hashing)
    const userDocs = await Promise.all(users.map(async u => {
      const doc = new User(u);
      await doc.save();
      return doc;
    }));
    console.log(`✅ Seeded ${userDocs.length} users`);

    // Seed Hospitals
    await Hospital.insertMany(hospitals);
    console.log(`✅ Seeded ${hospitals.length} hospitals`);

    // Seed Staff
    const staffWithPhcId = staffList.map(s => ({
      ...s,
      phc_id: s.hospital_id,
      role: s.role === 'ANM' ? 'Nurse' : s.role
    }));
    await Staff.insertMany(staffWithPhcId);
    console.log(`✅ Seeded ${staffList.length} staff`);

    // Seed Attendance
    await Attendance.insertMany(attendance);
    console.log(`✅ Seeded ${attendance.length} attendance records`);

    // Seed Stocks
    await Stock.insertMany(stocks);
    console.log(`✅ Seeded ${stocks.length} stock records`);

    // Seed Patients (bulk, 7 days)
    await Patient.insertMany(patients);
    console.log(`✅ Seeded ${patients.length} patient records`);

    // Seed Disease Cases
    await DiseaseCase.insertMany(diseaseCases);
    console.log(`✅ Seeded ${diseaseCases.length} disease cases`);

    // Seed Alerts
    await Alert.insertMany(alerts);
    console.log(`✅ Seeded ${alerts.length} alerts`);

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('─'.repeat(50));
    console.log('LOGIN CREDENTIALS:');
    console.log('─'.repeat(50));
    users.forEach(u => {
      console.log(`  📧 Email   : ${u.email}`);
      console.log(`  🔑 Password: ${u.password}`);
      console.log(`  🏙️  District: ${u.district}\n`);
    });

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

seed();
