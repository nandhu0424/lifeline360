const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  staff_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['Doctor', 'Nurse', 'LabTech', 'Cleaning Worker'], required: true },
  hospital_id: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  mobile: { type: String },
  email: { type: String },
  is_chief: { type: Boolean, default: false },
  essential_details: { type: String },
  phc_id: { type: String, required: true, index: true }, // Explicit PHC ID for mapping
  biometric_user_id: { type: Number, index: true }, // ID on the device (e.g., 101)
  biometric_device_id: { type: String, index: true }, // ID of the hardware (e.g., DEV01)
  shift_start: { type: String, default: '09:00 AM' },
  shift_end: { type: String, default: '05:00 PM' },
  weekly_schedule: {
    monday: { type: Object },
    tuesday: { type: Object },
    wednesday: { type: Object },
    thursday: { type: Object },
    friday: { type: Object },
    saturday: { type: Object },
    sunday: { type: Object }
  },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Staff', StaffSchema);
