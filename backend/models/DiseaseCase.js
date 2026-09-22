const mongoose = require('mongoose');

const DiseaseCaseSchema = new mongoose.Schema({
  hospital_id: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  disease_name: { type: String, required: true },
  case_count: { type: Number, default: 0 },
  usual_threshold: { type: Number, default: 2 },
  date: { type: String, required: true }, // YYYY-MM-DD
  alert_triggered: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DiseaseCase', DiseaseCaseSchema);
