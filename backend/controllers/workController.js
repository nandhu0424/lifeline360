const Work = require('../models/Work');

// @desc    Get all work assignments
// @route   GET /api/work
const getWork = async (req, res) => {
  try {
    const { role, hospital_id, district } = req.user;
    let query = {};

    if (role.toLowerCase() === 'ddhs') {
      // DDHS can see all work in their district
      query = { district: district };
    } else {
      // PHC can only see work assigned to them
      query = { assigned_to: hospital_id };
    }

    const assignments = await Work.find(query).sort({ created_at: -1 });
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign new work
// @route   POST /api/work
const assignWork = async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    if (userRole !== 'ddhs' && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only DDHS or ADMIN can assign work' });
    }

    const workData = {
      ...req.body,
      original_due_date: req.body.due_date,
      district: req.user.district
    };

    const work = await Work.create(workData);
    res.status(201).json({ success: true, data: work });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit report for work assignment (PHC)
// @route   POST /api/work/:id/report
const submitReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { completion_note, files } = req.body;

    const work = await Work.findById(id);
    if (!work) return res.status(404).json({ success: false, message: 'Work assignment not found' });

    work.status = 'Under Review';
    work.completion_note = completion_note;
    if (files && Array.isArray(files)) {
      const newFiles = files.map(f => ({
        url: f.url,
        filename: f.filename,
        filetype: f.filetype,
        uploaded_at: new Date()
      }));
      // Append new files to existing report_files (History)
      work.report_files = [...(work.report_files || []), ...newFiles];
    }

    await work.save();
    res.json({ success: true, data: work });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify work assignment (DDHS)
// @route   POST /api/work/:id/verify
const verifyWork = async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    console.log(`[VerifyWork] User: ${req.user.username}, Role: ${userRole}`);

    if (userRole !== 'ddhs' && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: `Access denied. Your role is ${req.user.role}. Only DDHS or ADMIN can verify work.` });
    }

    const { id } = req.params;
    const { status, feedback } = req.body; // status: 'Completed' or 'Action Required'

    const work = await Work.findById(id);
    if (!work) return res.status(404).json({ success: false, message: 'Work assignment not found' });

    work.status = status;
    if (feedback) work.completion_note = feedback;
    if (status === 'Completed') work.completed_at = new Date();

    await work.save();
    res.json({ success: true, data: work });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWork,
  assignWork,
  submitReport,
  verifyWork
};
