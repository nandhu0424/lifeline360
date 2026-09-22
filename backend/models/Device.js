const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  device_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phc_id: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  ip_address: { type: String },
  port: { type: Number, default: 8080 },
  status: { type: String, enum: ['online', 'offline', 'error'], default: 'online' },
  last_sync: { type: Date },
  push_endpoint: { type: String, default: '/api/attendance/push' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Device', DeviceSchema);
