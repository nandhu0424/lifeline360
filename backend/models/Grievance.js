const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
    reference_id: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    category: {
        type: String,
        required: true
    },
    district: {
        type: String
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['received', 'in_review', 'resolved', 'rejected'],
        default: 'received'
    },
    assigned_to: {
        type: String,
        default: ''
    },
    resolution_note: {
        type: String,
        default: ''
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Grievance', grievanceSchema);
