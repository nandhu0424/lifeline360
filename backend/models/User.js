const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  mobile: { type: String, trim: true }, // <-- Add this line
  role: { type: String, enum: ['DDHS', 'ADMIN'], default: 'DDHS' },
  district: { type: String, required: true },
  district_code: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  created_at: { type: Date, default: Date.now }
});


// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate JWT token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, username: this.username, district: this.district, role: this.role, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Compare entered password with hashed
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
