const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  alert_id: { type: String, required: true, unique: true },
  hospital_id: { type: String, required: true, index: true },
  hospital_name: { type: String },
  district: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['absenteeism', 'late_attendance', 'low_stock', 'low_opd', 'disease_outbreak', 'stock_request', 'stock_dispatched', 'stock_received', 'task_overdue'],
    required: true
  },
  message: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'sent', 'resolved'], default: 'pending' },
  email_sent: { type: Boolean, default: false },
  email_sent_to: { type: String },
  resolved_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Alert', AlertSchema);


