const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patient_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  hospital_id: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  visit_date: { type: String, required: true }, // YYYY-MM-DD
  visit_time: { type: String }, // HH:MM AM/PM
  symptoms: { type: String },
  diagnosis: { type: String },
  medicines: { type: String },
  prescriptions: { type: String }, // Can be detailed prescription text
  opd_number: { type: String },
  encrypted_aadhar: { type: String }, // Store aadhar in encrypted form
  contact: { type: String },
  purpose_of_visit: { type: String, enum: ['In-Patient', 'Out-Patient', 'Discharged'], default: 'Out-Patient' },
  doctor_handled: { type: String }, // Name or ID of the doctor
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', PatientSchema);
