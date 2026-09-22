/**
 * ============================================================
 *  Lifeline360 – FULL FRESH SEED SCRIPT
 *  Target DB : mongodb://localhost:27017/nirallifeline360
 *  Populates : hospitals, healthcenter_users, users, staffs,
 *              devices, attendances, alerts, stocks, patients,
 *              programs, works, diseasecases
 * ============================================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Models ──────────────────────────────────────────────────
const Hospital     = require('./models/Hospital');
const PHCUser      = require('./models/PHCUser');
const User         = require('./models/User');
const Staff        = require('./models/Staff');
const Device       = require('./models/Device');
const Attendance   = require('./models/Attendance');
const Alert        = require('./models/Alert');
const Stock        = require('./models/Stock');
const Patient      = require('./models/Patient');
const Program      = require('./models/Program');
const Work         = require('./models/Work');
const DiseaseCase  = require('./models/DiseaseCase');

// ── Connection ──────────────────────────────────────────────
const MONGO_URI = 'mongodb://localhost:27017/nirallifeline360';

// ── Utility helpers ─────────────────────────────────────────
const randomFrom   = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt    = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad          = n => String(n).padStart(2, '0');

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function timeStr(hour, minute) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${pad(h12)}:${pad(minute)} ${ampm}`;
}

// ── Master Data Arrays ──────────────────────────────────────

// ─── HOSPITALS (10 across 4 districts) ──────────────────────
const hospitals = [
  // Coimbatore
  { hospital_id: 'CBE001', name: 'Gandhipuram UPHC',       type: 'UPHC',       district: 'Coimbatore', location: { lat: 11.0168, lng: 76.9558 }, address: 'Gandhipuram, Coimbatore',      staff_count: 14, contact: '0422-2301001', email: 'cbe001@tnhealth.gov.in', status: 'active' },
  { hospital_id: 'CBE002', name: 'Sulur PHC',              type: 'PHC',        district: 'Coimbatore', location: { lat: 11.0362, lng: 77.1284 }, address: 'Sulur, Coimbatore',             staff_count: 10, contact: '0422-2301002', email: 'cbe002@tnhealth.gov.in', status: 'active' },
  { hospital_id: 'CBE003', name: 'Kinathukadavu Sub-Centre',type: 'Sub-Centre', district: 'Coimbatore', location: { lat: 10.8024, lng: 76.9882 }, address: 'Kinathukadavu, Coimbatore',    staff_count: 5,  contact: '0422-2301003', email: 'cbe003@tnhealth.gov.in', status: 'active' },
  // Salem
  { hospital_id: 'SLM001', name: 'Fairlands UPHC',         type: 'UPHC',       district: 'Salem',      location: { lat: 11.6643, lng: 78.1460 }, address: 'Fairlands, Salem',               staff_count: 12, contact: '0427-2401001', email: 'slm001@tnhealth.gov.in', status: 'active' },
  { hospital_id: 'SLM002', name: 'Attur PHC',              type: 'PHC',        district: 'Salem',      location: { lat: 11.5970, lng: 78.5962 }, address: 'Attur, Salem',                   staff_count: 9,  contact: '0427-2401002', email: 'slm002@tnhealth.gov.in', status: 'active' },
  // Trichy
  { hospital_id: 'TCH001', name: 'Srirangam UPHC',         type: 'UPHC',       district: 'Trichy',     location: { lat: 10.8630, lng: 78.6946 }, address: 'Srirangam, Trichy',              staff_count: 16, contact: '0431-2501001', email: 'tch001@tnhealth.gov.in', status: 'active' },
  { hospital_id: 'TCH002', name: 'Lalgudi PHC',            type: 'PHC',        district: 'Trichy',     location: { lat: 10.8725, lng: 78.8117 }, address: 'Lalgudi, Trichy',                staff_count: 8,  contact: '0431-2501002', email: 'tch002@tnhealth.gov.in', status: 'active' },
  { hospital_id: 'TCH003', name: 'Thottiyam Sub-Centre',   type: 'Sub-Centre', district: 'Trichy',     location: { lat: 10.9912, lng: 78.3356 }, address: 'Thottiyam, Trichy',              staff_count: 4,  contact: '0431-2501003', email: 'tch003@tnhealth.gov.in', status: 'active' },
  // Erode
  { hospital_id: 'ERD001', name: 'Perundurai PHC',         type: 'PHC',        district: 'Erode',      location: { lat: 11.2753, lng: 77.5872 }, address: 'Perundurai, Erode',              staff_count: 11, contact: '0424-2601001', email: 'erd001@tnhealth.gov.in', status: 'active' },
  { hospital_id: 'ERD002', name: 'Bhavani UPHC',           type: 'UPHC',       district: 'Erode',      location: { lat: 11.4505, lng: 77.6832 }, address: 'Bhavani, Erode',                 staff_count: 13, contact: '0424-2601002', email: 'erd002@tnhealth.gov.in', status: 'active' },
];

// ─── PHC USERS (login for each hospital) ────────────────────
const phcUsers = hospitals.map(h => ({
  hospital_id: h.hospital_id,
  district:    h.district,
  email:       `${h.hospital_id.toLowerCase()}@tnhealth.gov.in`,
  password:    'Niral@2026',
}));

// ─── DDHS USERS (one per district) ─────────────────────────
// District → mobile mapping
const DISTRICT_MOBILE = {
  'Coimbatore': '7604888972',
  'Salem':      '7695978014',
  'Trichy':     '9042914473',
  'Erode':      '9626806517',
};

const ddhsUsers = [
  { username: 'cbe_ddhs',  email: 'ssowndharya487@gmail.com',  password: 'Niral@2026', role: 'DDHS',  district: 'Coimbatore', district_code: 'CBE', mobile: '7604888972' },
  { username: 'slm_ddhs',  email: 'slm_ddhs@tnhealth.gov.in',  password: 'Niral@2026', role: 'DDHS',  district: 'Salem',      district_code: 'SLM', mobile: '7695978014' },
  { username: 'tch_ddhs',  email: 'tch_ddhs@tnhealth.gov.in',  password: 'Niral@2026', role: 'DDHS',  district: 'Trichy',     district_code: 'TCH', mobile: '9042914473' },
  { username: 'erd_ddhs',  email: 'erd_ddhs@tnhealth.gov.in',  password: 'Niral@2026', role: 'DDHS',  district: 'Erode',      district_code: 'ERD', mobile: '9626806517' },
  { username: 'niral_admin', email: 'admin@nirallifeline360.in', password: 'Niral@2026', role: 'ADMIN', district: 'Coimbatore', district_code: 'CBE', mobile: '7604888972' },
];

// ─── STAFF (4-6 per hospital ≈ 50 total) ────────────────────
const firstNames  = ['Arun','Bharathi','Chandran','Deepa','Ezhil','Fathima','Gopal','Hari','Indira','Janani','Karthik','Lakshmi','Murugan','Nithya','Oviya','Prakash','Ramya','Senthil','Thamarai','Uma','Velu','Yamini','Zara','Kavitha','Rajesh','Selvi','Bala','Meena','Siva','Priya'];
const roles       = ['Doctor','Nurse','LabTech','Cleaning Worker'];

// Individual staff mobile numbers — unique per staff member
// Doctors get real/tracked numbers; others get generated numbers
const STAFF_MOBILES = {
  // Erode – Perundurai PHC (ERD001) – Doctor Arun is first staff
  'NRL_ERD001_01': '7604888972', // Dr. Arun – personal number
  'NRL_ERD001_02': '9626806518',
  'NRL_ERD001_03': '9626806519',
  'NRL_ERD001_04': '9626806520',
  'NRL_ERD001_05': '9626806521',
  'NRL_ERD001_06': '9626806522',
  // Erode – Bhavani UPHC (ERD002)
  'NRL_ERD002_01': '9626806523',
  'NRL_ERD002_02': '9626806524',
  'NRL_ERD002_03': '9626806525',
  'NRL_ERD002_04': '9626806526',
  'NRL_ERD002_05': '9626806527',
  'NRL_ERD002_06': '9626806528',
  // Coimbatore – CBE001
  'NRL_CBE001_01': '7604888973',
  'NRL_CBE001_02': '7604888974',
  'NRL_CBE001_03': '7604888975',
  'NRL_CBE001_04': '7604888976',
  'NRL_CBE001_05': '7604888977',
  'NRL_CBE001_06': '7604888978',
  // Coimbatore – CBE002
  'NRL_CBE002_01': '7604888979',
  'NRL_CBE002_02': '7604888980',
  'NRL_CBE002_03': '7604888981',
  'NRL_CBE002_04': '7604888982',
  'NRL_CBE002_05': '7604888983',
  'NRL_CBE002_06': '7604888984',
  // Coimbatore – CBE003
  'NRL_CBE003_01': '7604888985',
  'NRL_CBE003_02': '7604888986',
  'NRL_CBE003_03': '7604888987',
  'NRL_CBE003_04': '7604888988',
  'NRL_CBE003_05': '7604888989',
  // Salem – SLM001
  'NRL_SLM001_01': '7695978015',
  'NRL_SLM001_02': '7695978016',
  'NRL_SLM001_03': '7695978017',
  'NRL_SLM001_04': '7695978018',
  'NRL_SLM001_05': '7695978019',
  'NRL_SLM001_06': '7695978020',
  // Salem – SLM002
  'NRL_SLM002_01': '7695978021',
  'NRL_SLM002_02': '7695978022',
  'NRL_SLM002_03': '7695978023',
  'NRL_SLM002_04': '7695978024',
  'NRL_SLM002_05': '7695978025',
  // Trichy – TCH001
  'NRL_TCH001_01': '9042914474',
  'NRL_TCH001_02': '9042914475',
  'NRL_TCH001_03': '9042914476',
  'NRL_TCH001_04': '9042914477',
  'NRL_TCH001_05': '9042914478',
  'NRL_TCH001_06': '9042914479',
  // Trichy – TCH002
  'NRL_TCH002_01': '9042914480',
  'NRL_TCH002_02': '9042914481',
  'NRL_TCH002_03': '9042914482',
  'NRL_TCH002_04': '9042914483',
  'NRL_TCH002_05': '9042914484',
  // Trichy – TCH003
  'NRL_TCH003_01': '9042914485',
  'NRL_TCH003_02': '9042914486',
  'NRL_TCH003_03': '9042914487',
  'NRL_TCH003_04': '9042914488',
};

function buildStaff() {
  const staff = [];
  let counter = 1;
  hospitals.forEach(h => {
    const numStaff = h.staff_count > 6 ? 6 : h.staff_count; // cap for seed
    for (let i = 1; i <= numStaff; i++) {
      const role = i <= 2 ? 'Doctor' : i <= 4 ? 'Nurse' : i === 5 ? 'LabTech' : 'Cleaning Worker';
      const name = `${role === 'Doctor' ? 'Dr. ' : ''}${firstNames[(counter - 1) % firstNames.length]}`;
      const staffId = `NRL_${h.hospital_id}_${pad(i)}`;
      // Use individual mobile if defined, else fallback to district DDHS number
      const mobile = STAFF_MOBILES[staffId] || DISTRICT_MOBILE[h.district] || '9876543210';
      staff.push({
        staff_id:          staffId,
        name,
        role,
        hospital_id:       h.hospital_id,
        district:          h.district,
        mobile,
        email:             `staff${counter}@tnhealth.gov.in`,
        is_chief:          i === 1,
        phc_id:            h.hospital_id,
        biometric_user_id: 100 + i,
        biometric_device_id: `DEV_${h.hospital_id}`,
        shift_start:       '09:00 AM',
        shift_end:         '05:00 PM',
        is_active:         true,
      });
      counter++;
    }
  });
  return staff;
}

// ─── DEVICES (one per hospital) ─────────────────────────────
const devices = hospitals.map((h, idx) => ({
  device_id:   `DEV_${h.hospital_id}`,
  name:        `BioScanner ${h.hospital_id}`,
  phc_id:      h.hospital_id,
  district:    h.district,
  ip_address:  `192.168.${10 + idx}.100`,
  port:        8080,
  status:      idx % 5 === 4 ? 'offline' : 'online',
  last_sync:   new Date(),
}));

// ─── ATTENDANCE (last 14 days × each staff) ─────────────────
function buildAttendance(staffArr) {
  const records = [];
  const statuses = ['present','present','present','late','present','present','absent'];
  for (const s of staffArr) {
    for (let day = 0; day < 14; day++) {
      const dt      = dateStr(day);
      const status  = statuses[randomInt(0, statuses.length - 1)];
      const isLate  = status === 'late';
      const ciHour  = isLate ? 10 : 9;
      const ciMin   = isLate ? randomInt(5, 45) : randomInt(0, 10);
      const coHour  = status === 'absent' ? 0 : randomInt(16, 17);
      const coMin   = status === 'absent' ? 0 : randomInt(0, 59);

      records.push({
        staff_id:           s.staff_id,
        staff_name:         s.name,
        staff_role:         s.role,
        hospital_id:        s.hospital_id,
        district:           s.district,
        date:               dt,
        check_in_time:      status === 'absent' ? null : timeStr(ciHour, ciMin),
        check_in_timestamp: status === 'absent' ? null : (() => { const d = new Date(dt); d.setHours(ciHour, ciMin); return d; })(),
        check_out_time:     status === 'absent' ? null : timeStr(coHour, coMin),
        check_out_timestamp: status === 'absent' ? null : (() => { const d = new Date(dt); d.setHours(coHour, coMin); return d; })(),
        status,
        is_late:            isLate,
        is_early_checkout:  coHour < 17 && status !== 'absent',
        late_minutes:       isLate ? (ciHour - 9) * 60 + ciMin : 0,
        early_checkout_minutes: coHour < 17 && status !== 'absent' ? (17 - coHour) * 60 - coMin : 0,
        total_hours:        status === 'absent' ? 0 : parseFloat(((coHour + coMin / 60) - (ciHour + ciMin / 60)).toFixed(1)),
        biometric_check_in: status !== 'absent',
        biometric_check_out: status !== 'absent',
        biometric_verified: status !== 'absent',
        source:             'biometric',
        device_id:          `DEV_${s.hospital_id}`,
        device_user_id:     s.biometric_user_id,
        sync_status:        'synced',
      });
    }
  }
  return records;
}

// ─── PATIENTS (8 per hospital ≈ 80) ────────────────────────
const symptoms      = ['Fever & body pain','Cough with sputum','Abdominal pain','Headache & dizziness','Skin rash','Joint pain','Chest tightness','Diarrhoea','Urinary infection','Eye irritation'];
const diagnoses     = ['Viral Fever','Upper Respiratory Infection','Gastritis','Migraine','Dermatitis','Rheumatoid Arthritis','Bronchitis','Acute Gastroenteritis','UTI','Conjunctivitis'];
const medicines     = ['Paracetamol 500mg','Azithromycin 250mg','Pantoprazole 40mg','Sumatriptan 50mg','Betamethasone Cream','Methotrexate 7.5mg','Salbutamol Inhaler','ORS + Zinc','Nitrofurantoin 100mg','Ciprofloxacin Eye Drops'];
const patientNames  = ['Anbu Selvan','Banu Priya','Chellammal','Durai Raj','Easwari','Ganesh Babu','Hemavathi','Ilango','Jayalakshmi','Kumaran','Latha Devi','Manikandan','Nagalakshmi','Om Prakash','Parvathi','Rajalakshmi','Saravanan','Thangam','Usha Devi','Vignesh','Vadivelu','Yogalakshmi','Zarina Begum','Kamatchi','Nagaraj','Pandi','Revathi','Sundari','Thangaraj','Velmurugan',
  'Amudha','Balasubramanian','Chitra','Dhanalakshmi','Elangovan','Geetha','Hariharan','Indumathi','Jeyakumar','Kalaivani','Lalitha','Maragatham','Nandini','Padma','Ramesh','Subramanian','Thenmozhi','Umarani','Vasanthi','Yuvarani'];

function buildPatients() {
  const patients = [];
  let pCounter = 1;
  hospitals.forEach(h => {
    for (let i = 0; i < 8; i++) {
      const idx = (pCounter - 1) % patientNames.length;
      const symIdx = randomInt(0, symptoms.length - 1);
      const daysAgo = randomInt(0, 30);
      patients.push({
        patient_id:       `PT_${h.hospital_id}_${pad(pCounter)}`,
        name:             patientNames[idx],
        age:              randomInt(5, 80),
        gender:           randomFrom(['Male', 'Female', 'Other']),
        hospital_id:      h.hospital_id,
        district:         h.district,
        visit_date:       dateStr(daysAgo),
        visit_time:       timeStr(randomInt(8, 16), randomInt(0, 59)),
        symptoms:         symptoms[symIdx],
        diagnosis:        diagnoses[symIdx],
        medicines:        medicines[symIdx],
        prescriptions:    `${medicines[symIdx]} – 1 tab twice daily for 5 days`,
        opd_number:       `OPD${String(2026000 + pCounter)}`,
        contact:          `97${randomInt(10000000, 99999999)}`,
        purpose_of_visit: randomFrom(['In-Patient', 'Out-Patient', 'Out-Patient', 'Out-Patient', 'Discharged']),
        doctor_handled:   `Dr. ${firstNames[randomInt(0, 10)]}`,
      });
      pCounter++;
    }
  });
  return patients;
}

// ─── STOCKS (6 medicines per hospital ≈ 60) ─────────────────
const medicineList = [
  { name: 'Paracetamol 500mg',     type: 'medicine',  maxCap: 2000, threshold: 200 },
  { name: 'Amoxicillin 250mg',     type: 'medicine',  maxCap: 1500, threshold: 150 },
  { name: 'Metformin 500mg',       type: 'medicine',  maxCap: 1000, threshold: 100 },
  { name: 'ORS Packets',           type: 'medicine',  maxCap: 3000, threshold: 300 },
  { name: 'Povidone-Iodine Solution', type: 'medicine', maxCap: 500,  threshold: 50 },
  { name: 'Digital Thermometer',   type: 'equipment', maxCap: 20,   threshold: 3 },
];

function buildStocks() {
  const stocks = [];
  hospitals.forEach(h => {
    medicineList.forEach(m => {
      const opening = randomInt(Math.floor(m.maxCap * 0.5), m.maxCap);
      const issued  = randomInt(50, Math.floor(opening * 0.6));
      const received = randomInt(0, 200);
      const closing = opening - issued + received;
      stocks.push({
        hospital_id:       h.hospital_id,
        district:          h.district,
        medicine_name:     m.name,
        type:              m.type,
        max_capacity:      m.maxCap,
        opening_stock:     opening,
        issued,
        received,
        closing_stock:     closing,
        minimum_threshold: m.threshold,
        request_status:    closing < m.threshold ? 'requested' : 'none',
      });
    });
  });
  return stocks;
}

// ─── ALERTS (20 assorted) ───────────────────────────────────
function buildAlerts() {
  const alerts = [];
  const types     = ['absenteeism','late_attendance','low_stock','low_opd','disease_outbreak','stock_request','stock_dispatched','stock_received'];
  const severities = ['low','medium','high'];
  const statusArr  = ['pending','sent','resolved'];

  const templates = {
    absenteeism:      h => `Staff absenteeism rate exceeded 30% at ${h.name}`,
    late_attendance:   h => `Multiple late check-ins detected at ${h.name} this week`,
    low_stock:         h => `Amoxicillin 250mg stock critically low at ${h.name}`,
    low_opd:           h => `OPD footfall dropped below threshold at ${h.name}`,
    disease_outbreak:  h => `Dengue case cluster (5+ cases) reported at ${h.name}`,
    stock_request:     h => `Stock replenishment request raised by ${h.name}`,
    stock_dispatched:  h => `Medicine dispatch confirmed for ${h.name}`,
    stock_received:    h => `Stock received and acknowledged by ${h.name}`,
  };

  for (let i = 0; i < 25; i++) {
    const h   = hospitals[i % hospitals.length];
    const typ = types[i % types.length];
    alerts.push({
      alert_id:      `ALT_NRL_${pad(i + 1)}`,
      hospital_id:   h.hospital_id,
      hospital_name: h.name,
      district:      h.district,
      type:          typ,
      message:       templates[typ](h),
      severity:      severities[i % 3],
      status:        statusArr[i % 3],
      email_sent:    i % 2 === 0,
      email_sent_to: i % 2 === 0 ? h.email : undefined,
      created_at:    new Date(Date.now() - i * 3600000 * 6), // spread over days
    });
  }
  return alerts;
}

// ─── PROGRAMS (8 health programs) ───────────────────────────
const programs = [
  { title: 'Pulse Polio Immunization Drive',        description: 'Administer oral polio vaccine to all children under 5 across all PHCs in the district.',                                   target_phc: 'All',    start_date: '2026-07-01', end_date: '2026-07-15', status: 'In Progress' },
  { title: 'National Deworming Day',                description: 'Mass deworming of school-age children (6-19 years) using Albendazole tablets at every health centre.',                     target_phc: 'All',    start_date: '2026-08-10', end_date: '2026-08-10', status: 'Pending' },
  { title: 'TB Screening Camp',                     description: 'Sputum collection and rapid molecular testing for symptomatic cough patients (>2 weeks) at Sulur PHC.',                    target_phc: 'CBE002', start_date: '2026-07-05', end_date: '2026-07-07', status: 'Completed', completion_notes: 'Screened 142 individuals. 3 positive cases referred for DOTS treatment.' },
  { title: 'Dengue Fogging & Awareness',            description: 'Anti-larval fogging and community awareness sessions in Srirangam UPHC catchment area.',                                  target_phc: 'TCH001', start_date: '2026-06-20', end_date: '2026-06-25', status: 'Completed', completion_notes: '12 wards fogged. 800+ pamphlets distributed.' },
  { title: 'Anaemia Screening – Adolescent Girls',  description: 'Hb testing and IFA tablet distribution for girls aged 10-19 at Fairlands UPHC.',                                          target_phc: 'SLM001', start_date: '2026-07-15', end_date: '2026-07-20', status: 'Pending' },
  { title: 'NCD Screening (Diabetes & Hypertension)', description: 'Random blood sugar and BP checkup camp for adults above 30 years at Perundurai PHC.',                                   target_phc: 'ERD001', start_date: '2026-07-10', end_date: '2026-07-12', status: 'In Progress' },
  { title: 'Maternal Health Check-up Week',         description: 'Comprehensive ANC checkup including ultrasonography for all registered pregnant women across Trichy district.',             target_phc: 'All',    start_date: '2026-08-01', end_date: '2026-08-07', status: 'Pending' },
  { title: 'COVID-19 Booster Vaccination',          description: 'Booster dose administration for healthcare workers and senior citizens (60+) at Bhavani UPHC.',                           target_phc: 'ERD002', start_date: '2026-06-01', end_date: '2026-06-15', status: 'Completed', completion_notes: '620 doses administered. Zero adverse events.' },
];

// ─── WORK ASSIGNMENTS (15 tasks) ────────────────────────────
function buildWorks() {
  const titles = [
    'Submit Monthly OPD Report',
    'Update Drug Inventory Register',
    'Repair Water Purifier',
    'Complete Staff Appraisal Forms',
    'Conduct Fire Safety Drill',
    'Paint Exterior Walls',
    'Upload HMIS Data for June',
    'Install CCTV at Entrance',
    'Calibrate BP Monitors',
    'Organize Blood Donation Camp',
    'Prepare Quarterly Budget Estimate',
    'Replace UPS Batteries',
    'Update Biomedical Waste Log',
    'Submit RSBY Claim Documents',
    'Pest Control Treatment',
  ];
  const categories = ['Report','Maintenance','Compliance','Admin','Infrastructure','IT','Health Camp'];
  const priorities = ['High','Medium','Low'];
  const statusArr  = ['Pending','In Progress','Under Review','Completed','Action Required'];

  return titles.map((title, i) => {
    const h = hospitals[i % hospitals.length];
    return {
      title,
      category:    categories[i % categories.length],
      assigned_to: h.hospital_id,
      due_date:    new Date(Date.now() + (i - 5) * 86400000 * 2), // some overdue, some future
      priority:    priorities[i % 3],
      description: `${title} — assigned to ${h.name}, ${h.district} district.`,
      status:      statusArr[i % statusArr.length],
      district:    h.district,
      completion_note: statusArr[i % statusArr.length] === 'Completed' ? 'Task completed and verified.' : undefined,
      completed_at:    statusArr[i % statusArr.length] === 'Completed' ? new Date() : undefined,
    };
  });
}

// ─── DISEASE CASES (last 7 days across hospitals) ───────────
function buildDiseaseCases() {
  const diseases = ['Dengue','Malaria','Typhoid','Chickenpox','Leptospirosis','Chikungunya','Measles','Hepatitis A'];
  const cases = [];
  hospitals.forEach(h => {
    for (let day = 0; day < 7; day++) {
      const disease = diseases[randomInt(0, diseases.length - 1)];
      const count   = randomInt(0, 8);
      cases.push({
        hospital_id:    h.hospital_id,
        district:       h.district,
        disease_name:   disease,
        case_count:     count,
        usual_threshold: 3,
        date:           dateStr(day),
        alert_triggered: count > 3,
      });
    }
  });
  return cases;
}



// ═══════════════════════════════════════════════════════════
//  MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════
async function seedAll() {
  try {
    console.log('🔌 Connecting to', MONGO_URI, '...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    // ── Drop all existing collections ──
    const collectionsToDrop = [
      'hospitals', 'healthcenter_users', 'users', 'staffs', 'devices',
      'attendances', 'alerts', 'stocks', 'patients', 'programs',
      'works', 'diseasecases'
    ];
    for (const coll of collectionsToDrop) {
      try {
        await mongoose.connection.db.dropCollection(coll);
        console.log(`   🗑️  Dropped: ${coll}`);
      } catch (e) { /* may not exist */ }
    }
    console.log('');

    // 1. Hospitals
    await Hospital.insertMany(hospitals);
    console.log(`✅  Hospitals         → ${hospitals.length} records`);

    // 2. PHC Users (save one-by-one for password hashing)
    for (const u of phcUsers) { await new PHCUser(u).save(); }
    console.log(`✅  PHC Users         → ${phcUsers.length} records`);

    // 3. DDHS / Admin Users
    for (const u of ddhsUsers) { await new User(u).save(); }
    console.log(`✅  DDHS Users        → ${ddhsUsers.length} records`);

    // 4. Staff
    const staffArr = buildStaff();
    await Staff.insertMany(staffArr);
    console.log(`✅  Staff             → ${staffArr.length} records`);

    // 5. Devices
    await Device.insertMany(devices);
    console.log(`✅  Devices           → ${devices.length} records`);

    // 6. Attendance
    const attendanceArr = buildAttendance(staffArr);
    // Use ordered:false to skip duplicates silently
    await Attendance.insertMany(attendanceArr, { ordered: false }).catch(() => {});
    console.log(`✅  Attendance        → ${attendanceArr.length} records`);

    // 7. Patients
    const patientArr = buildPatients();
    await Patient.insertMany(patientArr);
    console.log(`✅  Patients          → ${patientArr.length} records`);

    // 8. Stocks (save one-by-one to trigger pre-save status hook)
    const stockArr = buildStocks();
    for (const s of stockArr) { await new Stock(s).save(); }
    console.log(`✅  Stocks            → ${stockArr.length} records`);

    // 9. Alerts
    const alertArr = buildAlerts();
    await Alert.insertMany(alertArr);
    console.log(`✅  Alerts            → ${alertArr.length} records`);

    // 10. Programs
    await Program.insertMany(programs);
    console.log(`✅  Programs          → ${programs.length} records`);

    // 11. Work Assignments
    const workArr = buildWorks();
    await Work.insertMany(workArr);
    console.log(`✅  Works             → ${workArr.length} records`);

    // 12. Disease Cases
    const diseaseArr = buildDiseaseCases();
    await DiseaseCase.insertMany(diseaseArr);
    console.log(`✅  Disease Cases     → ${diseaseArr.length} records`);

    // ── Summary ──
    const total = hospitals.length + phcUsers.length + ddhsUsers.length + staffArr.length +
      devices.length + attendanceArr.length + patientArr.length + stockArr.length +
      alertArr.length + programs.length + workArr.length + diseaseArr.length;

    console.log('\n══════════════════════════════════════════════');
    console.log(`🎉  SEED COMPLETE — ${total} total documents inserted`);
    console.log(`📦  Database: nirallifeline360`);
    console.log('══════════════════════════════════════════════\n');

    console.log('🔑  Login Credentials:');
    console.log('   ─────────────────────────────────────────');
    console.log('   DDHS Logins:');
    ddhsUsers.forEach(u => console.log(`     ${u.username} / ${u.password} (${u.district})`));
    console.log('   PHC Logins:');
    phcUsers.forEach(u => console.log(`     ${u.hospital_id} / ${u.password}`));
    console.log('   ─────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seedAll();
