const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const grievanceStaffSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },
    password_hash: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Method to verify password
grievanceStaffSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password_hash);
};

module.exports = mongoose.model('GrievanceStaff', grievanceStaffSchema);
