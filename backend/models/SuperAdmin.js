const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SuperAdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, default: 'superadmin' },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});

// Hash password before save
SuperAdminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Generate JWT token
SuperAdminSchema.methods.getSignedJwtToken = function () {
    return jwt.sign(
        { id: this._id, username: this.username, email: this.email, role: 'superadmin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// Compare entered password with hashed
SuperAdminSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('SuperAdmin', SuperAdminSchema);
