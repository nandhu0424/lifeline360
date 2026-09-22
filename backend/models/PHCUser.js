const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PHCUserSchema = new mongoose.Schema({
  hospital_id: { type: String, required: true, unique: true },
  district: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  role: { type: String, default: 'phc' },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  created_at: { type: Date, default: Date.now }
});

// Hash password before save
PHCUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = mongoose.model('PHCUser', PHCUserSchema, 'healthcenter_users');
