const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  staff_id: { type: String, required: true, index: true },
  staff_name: { type: String },
  staff_role: { type: String },
  hospital_id: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  check_in_time: { type: String, default: null },
  check_in_timestamp: { type: Date, default: null },
  check_out_time: { type: String, default: null },
  check_out_timestamp: { type: Date, default: null },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'late_checkin', 'early_checkout', 'duty_completed', 'half_day', 'no_checkout'],
    default: 'absent'
  },
  is_late: { type: Boolean, default: false },
  is_early_checkout: { type: Boolean, default: false },
  late_minutes: { type: Number, default: 0 },
  early_checkout_minutes: { type: Number, default: 0 },
  total_hours: { type: Number, default: 0 },
  overtime_minutes: { type: Number, default: 0 },
  biometric_check_in: { type: Boolean, default: false },
  biometric_check_out: { type: Boolean, default: false },
  biometric_verified: { type: Boolean, default: false }, // Keeping for backward compatibility
  source: { type: String, enum: ['biometric', 'manual', 'api'], default: 'manual' },
  device_id: { type: String, index: true },
  device_user_id: { type: Number, index: true },
  sync_status: { type: String, enum: ['synced', 'pending', 'failed'], default: 'synced' },
  notes: { type: String, default: null },               // Audit notes (e.g., auto-close messages)
  server_timestamp: { type: Date, default: Date.now }
});

// Compound index for fast lookups
AttendanceSchema.index({ staff_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
