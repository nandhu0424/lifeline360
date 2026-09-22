const mongoose = require('mongoose');

const WorkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: 'Others' },
  assigned_to: { type: String, required: true, index: true }, // hospital_id
  due_date: { type: Date, required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  description: { type: String },
  status: { type: String, enum: ['Pending', 'In Progress', 'Under Review', 'Completed', 'Action Required'], default: 'Pending' },
  completion_note: { type: String },
  report_files: [{
    url: String,
    filename: String,
    filetype: String, // 'pdf', 'image', 'excel'
    uploaded_at: { type: Date, default: Date.now }
  }],
  completed_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  district: { type: String }, // To filter by DDHS district
  is_reassigned: { type: Boolean, default: false },
  reassigned_count: { type: Number, default: 0 },
  original_due_date: { type: Date },
  last_reassigned_at: { type: Date }
});

module.exports = mongoose.model('Work', WorkSchema);
