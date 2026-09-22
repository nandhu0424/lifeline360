const Program = require('../models/Program');

// @desc    Get all programs for the current PHC or all PHCs
// @route   GET /api/programs
const getPrograms = async (req, res) => {
  try {
    const { hospital_id, role } = req.user;

    let query = {};
    if (role.toLowerCase() !== 'ddhs') {
      // PHC can see 'All' or specifically targeted to them
      query = { $or: [{ target_phc: 'All' }, { target_phc: hospital_id }] };
    }

    const programs = await Program.find(query).sort({ created_at: -1 });

    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new program (DDHS only)
// @route   POST /api/programs
const addProgram = async (req, res) => {
  try {
    if (req.user.role.toLowerCase() !== 'ddhs') {
      return res.status(403).json({ success: false, message: 'Only DDHS can create programs' });
    }

    const program = await Program.create(req.body);
    res.status(201).json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report completion of a program (PHC)
// @route   POST /api/programs/:id/report
const reportProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, files } = req.body; // files can be array of URLs or base64

    const program = await Program.findById(id);
    if (!program) return res.status(404).json({ success: false, message: 'Program not found' });

    program.status = 'Completed';
    program.completion_notes = notes;
    if (files && Array.isArray(files)) {
      program.report_files = files.map(f => ({ url: f.url, type: f.type, uploaded_at: new Date() }));
    }

    await program.save();
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPrograms,
  addProgram,
  reportProgram
};
