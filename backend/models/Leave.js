const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
    leave_id: { type: String, required: true, unique: true },
    staff_id: { type: String, required: true, index: true },
    staff_name: { type: String, required: true },
    staff_role: { type: String },
    hospital_id: { type: String, required: true, index: true },
    hospital_name: { type: String },
    district: { type: String, required: true, index: true },
    leave_type: {
        type: String,
        enum: ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Emergency Leave', 'Compensatory Leave'],
        required: true
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    total_days: { type: Number, required: true },
    reason: { type: String, required: true },
    remarks: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: 'Pending',
        index: true
    },
    applied_on: { type: Date, default: Date.now },
    reviewed_on: { type: Date },
    reviewed_by: { type: String }
});

module.exports = mongoose.model('Leave', LeaveSchema);
