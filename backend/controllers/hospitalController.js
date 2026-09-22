const Hospital = require('../models/Hospital');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const Stock = require('../models/Stock');
const Patient = require('../models/Patient');
const { sendManualAlertEmail } = require('../utils/emailService');
const Alert = require('../models/Alert');
const { v4: uuidv4 } = require('crypto');

// @desc    Get all hospitals in district
// @route   GET /api/hospitals
const getHospitals = async (req, res) => {
  try {
    const filter = { ...req.districtFilter, status: 'active' };
    if (req.query.type) filter.type = req.query.type;

    const hospitals = await Hospital.find(filter).sort({ type: 1, name: 1 });
    res.json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single hospital with full details
// @route   GET /api/hospitals/:id
const getHospitalDetails = async (req, res) => {
  try {
    const { district } = req.user;
    const { range } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let days = 7;
    if (range === '1M') days = 30;
    else if (range === '3M') days = 90;
    else if (range === '1Y') days = 365;
    else if (range === '2W') days = 14; // Keep support for previous default if needed

    const opdDates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      opdDates.push(d.toISOString().split('T')[0]);
    }

    const { startDate, endDate } = req.query;
    let patientQuery = { hospital_id: req.params.id };
    if (startDate && endDate) {
      patientQuery.visit_date = { $gte: startDate, $lte: endDate };
    } else {
      patientQuery.visit_date = today;
    }

    const [hospital, staff, attendance, stocksRaw, opdToday, opdHistoryRaw, recentPatientsRaw] = await Promise.all([
      Hospital.findOne({ hospital_id: req.params.id, district }),
      Staff.find({ hospital_id: req.params.id, district, is_active: true }),
      Attendance.find({ hospital_id: req.params.id, district, date: today }),
      Stock.find({ hospital_id: req.params.id }).sort({ last_updated: -1 }),
      Patient.countDocuments({ hospital_id: req.params.id, district, visit_date: today }),
      Patient.aggregate([
        { $match: { hospital_id: req.params.id, visit_date: { $in: opdDates } } },
        { $group: { _id: '$visit_date', count: { $sum: 1 } } }
      ]),
      Patient.find(patientQuery)
        .sort({ visit_date: -1, created_at: -1 })
        .lean()
    ]);

    // Deduplicate stocks by medicine_name (case-insensitive)
    const stocks = Object.values(stocksRaw.reduce((acc, curr) => {
      const nameKey = curr.medicine_name.toLowerCase().trim();
      if (!acc[nameKey]) acc[nameKey] = curr;
      return acc;
    }, {}));

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    // Format OPD History
    const opdMap = {};
    opdHistoryRaw.forEach(item => { opdMap[item._id] = item.count; });
    const opd_history = opdDates.map(date => ({
      date,
      count: opdMap[date] || 0,
      label: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }));

    // Anomaly Detection Logic
    const baseline = opd_history.slice(0, 7); // First 7 days
    const baselineAvg = baseline.reduce((acc, curr) => acc + curr.count, 0) / 7;
    const recent = opd_history.slice(-3); // Last 3 days
    const recentAvg = recent.reduce((acc, curr) => acc + curr.count, 0) / 3;

    let anomaly = { detected: false, message: '' };
    if (baselineAvg > 30 && recentAvg < 10) {
      anomaly = {
        detected: true,
        message: `Critical: Significant drop in OPD visits detected. Average fell from ${Math.round(baselineAvg)} to ${Math.round(recentAvg)}.`
      };
    } else if (baselineAvg > 50 && recentAvg < (baselineAvg * 0.3)) {
      anomaly = {
        detected: true,
        message: `Warning: Sudden 70% decrease in patient volume compared to normal levels.`
      };
    }

    // Merge staff with today's attendance
    const attendanceMap = {};
    attendance.forEach(a => { attendanceMap[a.staff_id] = a; });

    const staffWithStatus = staff.map(s => ({
      staff_id: s.staff_id,
      name: s.name,
      role: s.role,
      biometric_id: s.biometric_id,
      mobile: s.mobile,
      status: attendanceMap[s.staff_id]?.status || 'absent',
      check_in_time: attendanceMap[s.staff_id]?.check_in_time || null,
      check_out_time: attendanceMap[s.staff_id]?.check_out_time || null,
      late_minutes: attendanceMap[s.staff_id]?.late_minutes || 0,
      shift_type: s.shift_type,
      shift_start: s.shift_start,
      shift_end: s.shift_end,
      weekly_schedule: s.weekly_schedule
    }));

    // Mask Aadhar for patient records before sending to DDHS
    const patients = recentPatientsRaw.map(p => {
      const masked = { ...p };
      if (p.encrypted_aadhar) {
        try {
          const crypto = require('crypto');
          const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
          const textParts = p.encrypted_aadhar.split(':');
          const iv = Buffer.from(textParts.shift(), 'hex');
          const encryptedText = Buffer.from(textParts.join(':'), 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
          let decrypted = decipher.update(encryptedText);
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          const plain = decrypted.toString();
          masked.aadhar_masked = '********' + plain.slice(-4);
        } catch (e) {
          masked.aadhar_masked = '************';
        }
      } else {
        masked.aadhar_masked = 'Not provided';
      }
      delete masked.encrypted_aadhar;
      return masked;
    });

    res.json({
      success: true,
      data: {
        hospital,
        staff: staffWithStatus,
        opd_count_today: opdToday,
        opd_history,
        anomaly,
        stocks,
        patients
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send manual alert email for a hospital
// @route   POST /api/hospitals/alert
const sendHospitalAlert = async (req, res) => {
  try {
    const { hospital_id, message, subject } = req.body;
    const { district, email } = req.user;

    const hospital = await Hospital.findOne({ hospital_id, district });
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found.' });

    await sendManualAlertEmail({
      districtEmail: email,
      district,
      hospitalName: hospital.name,
      subject: subject || `Manual Alert - ${hospital.name}`,
      message
    });

    // Log alert in DB
    const alert = new Alert({
      alert_id: `MANUAL-${Date.now()}`,
      hospital_id,
      hospital_name: hospital.name,
      district,
      type: 'absenteeism',
      message: message || `Manual alert sent for ${hospital.name}`,
      severity: 'medium',
      status: 'sent',
      email_sent: true,
      email_sent_to: email
    });
    await alert.save();

    res.json({ success: true, message: 'Alert email sent successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get hospital name and address by ID (for login auto-fetch)
// @route   GET /api/phc/name/:id
const getHospitalNameOnly = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ hospital_id: req.params.id.toUpperCase() });
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }
    res.json({ success: true, name: hospital.name, address: hospital.address });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new hospital
const createHospital = async (req, res) => {
  try {
    const { district } = req.user;
    const { hospital_id, name, type, address, contact, email, location } = req.body;

    const existing = await Hospital.findOne({ hospital_id: hospital_id.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Hospital ID already exists.' });
    }

    const hospital = new Hospital({
      hospital_id: hospital_id.toUpperCase(),
      name,
      type,
      district,
      address,
      contact,
      email,
      location: location || { lat: 0, lng: 0 },
      status: 'active'
    });

    await hospital.save();
    res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a hospital
const updateHospital = async (req, res) => {
  try {
    const { district } = req.user;
    const { id } = req.params; // this is the _id or hospital_id? usually _id in put
    const updates = req.body;

    const hospital = await Hospital.findOneAndUpdate(
      { _id: id, district },
      { $set: updates },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }

    res.json({ success: true, data: hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getHospitals, getHospitalDetails, sendHospitalAlert, getHospitalNameOnly, createHospital, updateHospital };
