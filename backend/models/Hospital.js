const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  hospital_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['PHC', 'UPHC', 'Sub-Centre', 'SUB_CENTRE'], required: true },
  district: { type: String, required: true, index: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: { type: String },
  staff_count: { type: Number, default: 0 },
  contact: { type: String },
  email: { type: String },
  announcements: [{
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hospital', HospitalSchema);
