const Staff = require('../models/Staff');

// @desc    Get all staff for the current PHC
// @route   GET /api/staff
const getStaffList = async (req, res) => {
  try {
    const { hospital_id } = req.user;

    if (!hospital_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const staffList = await Staff.find({ hospital_id });

    // Grouping logic for the frontend
    const medical = staffList.filter(s => ['Doctor', 'Nurse', 'LabTech'].includes(s.role));
    const cleaning = staffList.filter(s => s.role === 'Cleaning Worker');

    res.json({
      success: true,
      data: {
        medical,
        cleaning
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add new staff member
// @route   POST /api/staff
const createStaff = async (req, res) => {
  try {
    const { hospital_id, district } = req.user;
    
    // Generate a unique staff_id if not provided
    if (!req.body.staff_id) {
      const count = await Staff.countDocuments({ hospital_id });
      req.body.staff_id = `${hospital_id}-ST-${(count + 1).toString().padStart(3, '0')}`;
    }

    const newStaff = new Staff({
      ...req.body,
      hospital_id,
      phc_id: hospital_id,
      district
    });

    await newStaff.save();

    res.status(201).json({
      success: true,
      data: newStaff
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update staff details
// @route   PUT /api/staff/:id
const updateStaff = async (req, res) => {
  try {
    const { hospital_id } = req.user;
    const { id } = req.params;

    const staff = await Staff.findOne({ _id: id, hospital_id });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const updatedStaff = await Staff.findByIdAndUpdate(id, req.body, { new: true });

    res.json({
      success: true,
      data: updatedStaff
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
const deleteStaff = async (req, res) => {
  try {
    const { hospital_id } = req.user;
    const { id } = req.params;

    const staff = await Staff.findOne({ _id: id, hospital_id });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await Staff.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Staff member removed successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStaffList,
  updateStaff,
  createStaff,
  deleteStaff
};
