const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  reference_id: { type: String, unique: true, sparse: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  category: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 5000 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Feedback', feedbackSchema);
