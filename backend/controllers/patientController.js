const Patient = require('../models/Patient');
const crypto = require('crypto');

// Basic encryption configuration (in production, use env variables)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // Must be 256 bits (32 bytes)
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return null;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// @desc    Get all patients with search/filter
// @route   GET /api/patients
const getPatients = async (req, res) => {
  try {
    const { hospital_id } = req.user;
    const { search, month, year, date } = req.query;

    if (!hospital_id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    let query = { hospital_id };

    if (search) {
      // If it looks like Aadhar, we'll need to do a manual check later or handle it here
      // For now, standard fields
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } },
        { patient_id: { $regex: search, $options: 'i' } },
        { diagnosis: { $regex: search, $options: 'i' } }
      ];
    }

    if (date) {
      query.visit_date = date; // Match exact date YYYY-MM-DD
    } else if (year && month) {
      const monthStr = month.toString().padStart(2, '0');
      query.visit_date = { $regex: new RegExp(`^${year}-${monthStr}-`) };
    } else if (year) {
      query.visit_date = { $regex: new RegExp(`^${year}-`) };
    } else if (month) {
      const monthStr = month.toString().padStart(2, '0');
      query.visit_date = { $regex: new RegExp(`^\\d{4}-${monthStr}-\\d{2}$`) };
    }

    let patients = await Patient.find(query).sort({ created_at: -1 });

    // Handle Aadhar search: if search looks like Aadhar (12 digits), search and merge results
    if (search && search.length === 12 && /^\d+$/.test(search)) {
      const allPatients = await Patient.find({ hospital_id, ...query, $or: undefined }); // Fetch all potential candidates for this hospital/date
      const aadharMatches = allPatients.filter(p => p.encrypted_aadhar && decrypt(p.encrypted_aadhar) === search);
      
      // Merge and remove duplicates by ID
      const existingIds = new Set(patients.map(p => p._id.toString()));
      aadharMatches.forEach(am => {
        if (!existingIds.has(am._id.toString())) {
          patients.push(am);
        }
      });
      // Re-sort after merge
      patients.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Decrypt aadhar for authorized personnel if needed, but usually kept encrypted.
    const maskedPatients = patients.map(p => {
      const obj = p.toObject();
      if (obj.encrypted_aadhar) {
        try {
          const decrypted = decrypt(obj.encrypted_aadhar);
          // Show only last 4 digits for security
          obj.aadhar_masked = '********' + decrypted.slice(-4);
        } catch (e) {
          obj.aadhar_masked = '********' + obj.encrypted_aadhar.slice(-4);
        }
      }
      return obj;
    });

    res.json({ success: true, data: maskedPatients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add single patient (Manual entry)
// @route   POST /api/patients
const addPatient = async (req, res) => {
  try {
    const { hospital_id, district } = req.user;
    const { aadhar, ...rest } = req.body;

    if (!aadhar) {
      return res.status(400).json({ success: false, message: 'Aadhar Number is required' });
    }

    let finalPatientId = rest.patient_id;
    let encryptedAadhar = null;

    if (aadhar) {
      encryptedAadhar = encrypt(aadhar);
      // Try to find if this patient already visited and has an ID
      const allPatients = await Patient.find({ hospital_id }).select('patient_id encrypted_aadhar');
      const existing = allPatients.find(p => p.encrypted_aadhar && decrypt(p.encrypted_aadhar) === aadhar);
      
      if (existing) {
        finalPatientId = existing.patient_id;
      }
    }

    // If still no ID (new patient), generate one
    if (!finalPatientId) {
      const count = await Patient.countDocuments({ hospital_id });
      const timestamp = Date.now().toString().slice(-4);
      finalPatientId = `${hospital_id}-PT-${(count + 1).toString().padStart(4, '0')}`;
    }

    const patientData = { 
      ...rest, 
      patient_id: finalPatientId,
      encrypted_aadhar: encryptedAadhar,
      hospital_id, 
      district 
    };

    const patient = await Patient.create(patientData);
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk upload patients via JSON (parsed from Excel)
// @route   POST /api/patients/bulk
const bulkUploadPatients = async (req, res) => {
  try {
    const { hospital_id, district } = req.user;
    const { patients } = req.body; // Expecting array of patients

    if (!patients || !Array.isArray(patients)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    const processedPatients = patients.map(p => {
      let encrypted_aadhar = null;
      if (p.aadhar) {
        encrypted_aadhar = encrypt(p.aadhar.toString());
      }
      return {
        ...p,
        hospital_id,
        district,
        encrypted_aadhar
      };
    });

    // Use insertMany or iterate to avoid dupes (using simple iteration for upsert/error handling)
    for (const p of processedPatients) {
      if (p.patient_id) {
        await Patient.findOneAndUpdate(
          { patient_id: p.patient_id, hospital_id },
          p,
          { upsert: true, new: true }
        );
      } else {
        p.patient_id = `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await Patient.create(p);
      }
    }

    res.json({ success: true, message: 'Bulk upload successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get total patient/OPD reports
const getPatientTotal = async (req, res) => {
  try {
    const { district } = req.user;
    const period = req.query.period || 'daily';
    const today = new Date().toISOString().split('T')[0];

    let startDate = today;
    if (period === 'weekly') {
      const d = new Date(); d.setDate(d.getDate() - 6);
      startDate = d.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      const d = new Date(); d.setDate(d.getDate() - 29);
      startDate = d.toISOString().split('T')[0];
    }

    const result = await Patient.aggregate([
      { $match: { district, visit_date: { $gte: startDate, $lte: today } } },
      { $group: { _id: { date: '$visit_date', hospital_id: '$hospital_id' }, count: { $sum: 1 } } }
    ]);

    const totalCount = result.reduce((sum, r) => sum + r.count, 0);

    const byHospital = {};
    result.forEach(r => {
      if (!byHospital[r._id.hospital_id]) byHospital[r._id.hospital_id] = 0;
      byHospital[r._id.hospital_id] += r.count;
    });

    res.json({
      success: true,
      data: { period, total_patients: totalCount, by_hospital: byHospital, records: result }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get patient trend data for charts (last 7 or 30 days)
const getPatientTrend = async (req, res) => {
  try {
    const { district } = req.user;
    const days = parseInt(req.query.days) || 7;

    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const result = await Patient.aggregate([
      { $match: { district, visit_date: { $in: dates } } },
      { $group: { _id: '$visit_date', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const trendMap = {};
    dates.forEach(d => { trendMap[d] = 0; });
    result.forEach(r => { trendMap[r._id] = r.count; });

    res.json({
      success: true,
      data: dates.map(d => ({
        date: d,
        label: new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        count: trendMap[d]
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update patient record
// @route   PUT /api/patients/:id
const updatePatient = async (req, res) => {
  try {
    const { hospital_id } = req.user;
    const { id } = req.params;
    const updateData = { ...req.body };

    if (req.body.aadhar) {
      updateData.encrypted_aadhar = encrypt(req.body.aadhar);
      delete updateData.aadhar;
    }

    const patient = await Patient.findOneAndUpdate(
      { _id: id, hospital_id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }

    // If personal info changed, update all records for this patient
    const personalFields = ['name', 'gender', 'contact', 'age', 'encrypted_aadhar'];
    const hasPersonalUpdate = personalFields.some(field => updateData[field] !== undefined);

    if (hasPersonalUpdate) {
      const { patient_id } = patient;
      const updateObj = {};
      personalFields.forEach(f => {
        if (updateData[f] !== undefined) updateObj[f] = updateData[f];
      });

      await Patient.updateMany(
        { patient_id, hospital_id },
        { $set: updateObj }
      );
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lookup patient by Aadhar or Mobile
// @route   GET /api/patients/lookup/:identifier
const lookupPatient = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { hospital_id } = req.user;

    // 1. Try to find by patient_id or contact first (indexed fields)
    let patient = await Patient.findOne({
      hospital_id,
      $or: [
        { patient_id: identifier },
        { contact: identifier }
      ]
    }).sort({ created_at: -1 });

    // 2. If not found and identifier looks like Aadhar (12 digits), search by decrypted aadhar
    if (!patient && identifier.length === 12 && /^\d+$/.test(identifier)) {
      const allPatients = await Patient.find({ hospital_id }).select('name age gender contact patient_id encrypted_aadhar');
      patient = allPatients.find(p => p.encrypted_aadhar && decrypt(p.encrypted_aadhar) === identifier);
    }

    if (!patient) {
      return res.json({ success: false, message: 'No record found' });
    }

    res.json({
      success: true,
      data: {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        contact: patient.contact,
        patient_id: patient.patient_id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get patient visit history
// @route   GET /api/patients/history/:patient_id
const getPatientHistory = async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { hospital_id } = req.user;

    const history = await Patient.find({ patient_id, hospital_id }).sort({ visit_date: -1, created_at: -1 });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPatients,
  addPatient,
  bulkUploadPatients,
  getPatientTotal,
  getPatientTrend,
  updatePatient,
  lookupPatient,
  getPatientHistory
};
