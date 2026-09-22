const mongoose = require('mongoose');

const ProgramSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  target_phc: { type: String, default: 'All' }, // PHC code or 'All'
  start_date: { type: String }, // YYYY-MM-DD
  end_date: { type: String }, // YYYY-MM-DD
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  report_files: [{ 
    url: String, 
    type: String, // 'pdf', 'image', 'doc'
    uploaded_at: { type: Date, default: Date.now }
  }],
  completion_notes: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Program', ProgramSchema);
