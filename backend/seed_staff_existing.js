const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Hospital = require('./models/Hospital');
const Staff = require('./models/Staff');
const Patient = require('./models/Patient');
const Attendance = require('./models/Attendance');
const Stock = require('./models/Stock');

dotenv.config();

// Encryption Setup
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const firstNames = ['Arjun', 'Aditi', 'Bala', 'Chitra', 'Deepak', 'Eswari', 'Ganesh', 'Hari', 'Indira', 'Jaya', 'Karthik', 'Lakshmi', 'Mani', 'Nandini', 'Omsakthi', 'Prabhu', 'Rani', 'Senthil', 'Uma', 'Vijay', 'Yuvraj', 'Anbu', 'Banumathi', 'Chandran', 'Devi', 'Elango', 'Gita', 'Hemant', 'Ishwarya', 'Jagan', 'Kavitha', 'Logesh', 'Meena', 'Naveen', 'Pavithra', 'Rajesh', 'Saranya', 'Thilak', 'Vani', 'Yashoda', 'Aravind', 'Bhuvan', 'Divya', 'Gokul', 'Ishani', 'Kamal', 'Leela', 'Madhav', 'Nisha', 'Prakash', 'Ramya', 'Sanjay', 'Tara', 'Varun', 'Yamini'];
const lastNames = ['Kumar', 'Rajan', 'Devi', 'Selvam', 'Priya', 'Mani', 'Lakshmi', 'Balan', 'Suriya', 'Nair', 'Pillai', 'Iyer', 'Reddy', 'Gounder', 'Naidu', 'Chettiar', 'Nadit', 'Verma', 'Sharma', 'Singh', 'Patel', 'Das', 'Murthy', 'Rao', 'Venkatesh', 'Subramanian', 'Krishnan', 'Raghavan', 'Srinivasan', 'Balaji'];

const getRandomName = (isDr = false) => {
  const f = firstNames[Math.floor(Math.random() * firstNames.length)];
  const l = lastNames[Math.floor(Math.random() * lastNames.length)];
  return (isDr ? 'Dr. ' : '') + f + ' ' + l;
};

const generateStaff = (hId, district) => {
  const staff = [];
  const roleTemplates = [
    { role: 'Doctor', title: 'Chief Medical Officer', dept: 'Administration', count: 1, isChief: true },
    { role: 'Doctor', title: 'Medical Officer', dept: 'General Medicine', count: 2, isChief: false },
    { role: 'Nurse', title: 'Head Nurse', dept: 'Nursing', count: 1, isChief: false },
    { role: 'Nurse', title: 'Staff Nurse', dept: 'Nursing', count: 4, isChief: false },
    { role: 'LabTech', title: 'Lab Technician', dept: 'Laboratory', count: 2, isChief: false },
    { role: 'Cleaning Worker', title: 'Helper', dept: 'Support', count: 2, isChief: false }
  ];

  let sCounter = 1;
  roleTemplates.forEach(t => {
    for (let i = 0; i < t.count; i++) {
      const sId = `${hId}-ST-${sCounter.toString().padStart(3, '0')}`;
      staff.push({
        staff_id: sId,
        hospital_id: hId,
        phc_id: hId, // Required by model
        district: district,
        name: getRandomName(t.role === 'Doctor'),
        role: t.role,
        is_chief: t.isChief,
        essential_details: `${t.title} - ${t.dept}`,
        shift_type: sCounter % 2 === 0 ? 'Night' : 'Day',
        status: 'Available',
        mobile: '9' + Math.floor(Math.random() * 900000000 + 100000000),
        email: `${sId.toLowerCase()}@lifeline360.gov.in`
      });
      sCounter++;
    }
  });
  return staff;
};

const generatePatients = (hId, district, staffList) => {
  const patients = [];
  const diagnosisList = ['Fever', 'Diabetes Checkup', 'Hypertension', 'Maternity Visit', 'General Weakness', 'Minor Injury', 'Stomach Ache', 'Skin Allergy', 'Respiratory Issue', 'Vaccination'];
  const medicineList = ['Paracetamol', 'Metformin', 'Amlodipine', 'Iron Tablets', 'ORS', 'Betadine', 'Antacids', 'Calamine', 'Salbutamol', 'Covaxin'];
  
  // Filter doctors from the hospital's staff list
  const doctors = staffList.filter(s => s.role === 'Doctor');
  
  // Generate 20 patient identities per hospital
  for (let i = 1; i <= 20; i++) {
    const randomAadhar = '5' + Math.floor(Math.random() * 90000000000 + 10000000000);
    const pName = getRandomName(false);
    const pAge = 5 + Math.floor(Math.random() * 75);
    const pGender = i % 2 === 0 ? 'Male' : 'Female';
    const pContact = '9' + Math.floor(Math.random() * 900000000 + 100000000);
    const pEncryptedAadhar = encrypt(randomAadhar);
    
    // Generate a proper Patient ID that isn't the Aadhar
    const pId = `${hId}-PT-${i.toString().padStart(4, '0')}`;

    // Each patient has 1-3 visits to create history
    const visitCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3 visits
    
    for (let v = 0; v < visitCount; v++) {
      const visitDate = new Date();
      visitDate.setDate(visitDate.getDate() - (v * 15)); // Visits spread by 15 days
      const dateStr = visitDate.toISOString().split('T')[0];
      
      const assignedDoctor = doctors[Math.floor(Math.random() * doctors.length)].name;
      const diagnosis = diagnosisList[Math.floor(Math.random() * diagnosisList.length)];
      const medicine = medicineList[Math.floor(Math.random() * medicineList.length)];

      patients.push({
        patient_id: pId, // Using the generated ID, not Aadhar
        hospital_id: hId,
        district: district,
        name: pName,
        age: pAge,
        gender: pGender,
        diagnosis: diagnosis,
        medicines: medicine,
        prescriptions: `Take ${medicine} twice daily after meals. Follow up if symptoms persist.`,
        visit_date: dateStr,
        visit_time: `${Math.floor(Math.random() * 12 + 1)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')} ${Math.random() > 0.5 ? 'AM' : 'PM'}`,
        purpose_of_visit: i % 5 === 0 ? 'In-Patient' : 'Out-Patient',
        contact: pContact,
        doctor_handled: assignedDoctor,
        encrypted_aadhar: pEncryptedAadhar
      });
    }
  }
  return patients;
};

const seedStaffForExistingPHCs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB database:', mongoose.connection.name);

    const hospitals = await Hospital.find({});
    console.log(`Found ${hospitals.length} hospitals. Processing...`);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    for (let i = 0; i < hospitals.length; i++) {
      const h = hospitals[i];
      
      // Clear existing for this hospital to avoid duplicates if rerun
      await Staff.deleteMany({ hospital_id: h.hospital_id });
      await Patient.deleteMany({ hospital_id: h.hospital_id });
      await Attendance.deleteMany({ hospital_id: h.hospital_id });
      await Stock.deleteMany({ hospital_id: h.hospital_id });

      const staffList = generateStaff(h.hospital_id, h.district);
      const patientList = generatePatients(h.hospital_id, h.district, staffList);
      
      // Generate Stocks & Equipment
      const stockItems = [
        { name: 'Paracetamol', type: 'medicine', cap: 1000 },
        { name: 'Amoxicillin', type: 'medicine', cap: 500 },
        { name: 'Ibuprofen', type: 'medicine', cap: 800 },
        { name: 'Cetirizine', type: 'medicine', cap: 600 },
        { name: 'ECG Machine', type: 'equipment', cap: 0 },
        { name: 'Oxygen Cylinder', type: 'equipment', cap: 0 },
        { name: 'Cotton Rolls', type: 'equipment', cap: 0 },
        { name: 'Injection Syringes', type: 'equipment', cap: 0 },
        { name: 'Wheelchair', type: 'equipment', cap: 0 },
        { name: 'First Aid Kit', type: 'equipment', cap: 0 }
      ];

      const phcStocks = stockItems.map(item => ({
        hospital_id: h.hospital_id,
        district: h.district,
        medicine_name: item.name,
        type: item.type,
        closing_stock: Math.floor(Math.random() * (item.type === 'medicine' ? 500 : 20)) + 5,
        max_capacity: item.cap,
        last_updated: new Date()
      }));

      await Staff.insertMany(staffList);
      await Patient.insertMany(patientList);
      await Stock.insertMany(phcStocks);

      const attendanceList = [];
      for (const date of dates) {
        staffList.forEach(s => {
          const isPresent = Math.random() > 0.2; // 80% present
          attendanceList.push({
            staff_id: s.staff_id,
            staff_name: s.name,
            staff_role: s.role,
            hospital_id: s.hospital_id,
            district: s.district,
            date: date,
            status: isPresent ? 'present' : 'absent',
            check_in_time: isPresent ? '09:' + Math.floor(Math.random() * 30).toString().padStart(2, '0') + ' AM' : null,
            source: 'manual'
          });
        });
      }
      await Attendance.insertMany(attendanceList);

      if ((i + 1) % 10 === 0 || i === hospitals.length - 1) {
        console.log(`Processed ${i + 1}/${hospitals.length} hospitals...`);
      }
    }

    console.log('SUCCESS: Staff, Patients (with rich visit history), and Attendance seeded for all existing PHCs.');
    process.exit(0);
  } catch (err) {
    console.error('SEED ERROR:', err);
    process.exit(1);
  }
};

seedStaffForExistingPHCs();
