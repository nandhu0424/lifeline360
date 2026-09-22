const Leave = require('../models/Leave');
const Staff = require('../models/Staff');
const Hospital = require('../models/Hospital');
const Attendance = require('../models/Attendance');
const { sendLeaveStatusEmail } = require('../utils/emailService');

// Simple unique ID generator (no external deps)
const genLeaveId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LV-${ts}-${rand}`;
};

// @desc    Get all leave requests for the DDHS district or PHC hospital
// @route   GET /api/leave
const getAllLeaves = async (req, res) => {
  try {
    const { district, hospital_id: userHospitalId, role } = req.user;
    const { status, hospital_id, leave_type, from, to } = req.query;

    const filter = { district };
    // Strict scoping: PHC users only see their own hospital's leaves
    if (role === 'phc' || userHospitalId) {
      filter.hospital_id = userHospitalId;
    } else if (hospital_id) {
      filter.hospital_id = hospital_id;
    }

    if (status) filter.status = status;
    if (leave_type) filter.leave_type = leave_type;
    if (from || to) {
      filter.start_date = {};
      if (from) filter.start_date.$gte = from;
      if (to) filter.start_date.$lte = to;
    }

    const leaves = await Leave.find(filter).sort({ applied_on: -1 });
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get leave summary stats (scoped for PHC vs DDHS)
// @route   GET /api/leave/summary
const getLeaveSummary = async (req, res) => {
  try {
    const { district, hospital_id: userHospitalId, role } = req.user;

    const filter = { district };
    if (role === 'phc' || userHospitalId) {
      filter.hospital_id = userHospitalId;
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [pending, approved, rejected, totalThisMonth] = await Promise.all([
      Leave.countDocuments({ ...filter, status: 'Pending' }),
      Leave.countDocuments({ ...filter, status: 'Approved' }),
      Leave.countDocuments({ ...filter, status: 'Rejected' }),
      Leave.countDocuments({
        ...filter,
        applied_on: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    // Leave type breakdown for current month
    const typeBreakdown = await Leave.aggregate([
      { $match: { ...filter, start_date: { $gte: monthStart } } },
      { $group: { _id: '$leave_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: { pending, approved, rejected, totalThisMonth, typeBreakdown }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit a new leave request (PHC staff / admin on behalf)
// @route   POST /api/leave
const applyLeave = async (req, res) => {
  try {
    const { staff_id, leave_type, start_date, end_date, reason } = req.body;

    if (!staff_id || !leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const staff = await Staff.findOne({ staff_id });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    // Fetch hospital name
    let hospital_name = staff.hospital_id;
    try {
      const hosp = await Hospital.findOne({ hospital_id: staff.hospital_id });
      if (hosp) hospital_name = hosp.name;
    } catch (_) { }

    // Calculate working days
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date.' });
    }
    let total_days = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) total_days++; // skip Sat & Sun
    }
    if (total_days === 0) total_days = 1;

    const leave = new Leave({
      leave_id: genLeaveId(),
      staff_id,
      staff_name: staff.name,
      staff_role: staff.role,
      hospital_id: staff.hospital_id,
      hospital_name,
      district: staff.district || req.user.district,
      leave_type,
      start_date,
      end_date,
      total_days,
      reason,
      status: 'Pending',
    });

    await leave.save();
    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or reject a leave request (DDHS / ADMIN ONLY)
// @route   PUT /api/leave/:id/review
const reviewLeave = async (req, res) => {
  try {
    if (req.user?.role === 'phc') {
      return res.status(403).json({
        success: false,
        message: 'PHC administrators cannot approve/reject leave requests. Approval must be performed by DDHS.'
      });
    }

    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected.' });
    }

    const leave = await Leave.findOne({ leave_id: id });
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Leave is already ${leave.status}.` });
    }

    leave.status = status;
    leave.remarks = remarks || '';
    leave.reviewed_on = new Date();
    leave.reviewed_by = req.user?.username || req.user?.email || 'DDHS Officer';

    await leave.save();

    // ── AUTO MARK ATTENDANCE AS ON_LEAVE WHEN APPROVED ───────────────────────
    if (status === 'Approved') {
      try {
        const staff = await Staff.findOne({ staff_id: leave.staff_id });
        if (staff) {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);

          // Iterate each calendar day in the leave range
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

            const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

            // Upsert: create if not exists, update if already exists
            await Attendance.findOneAndUpdate(
              { staff_id: leave.staff_id, date: dateStr },
              {
                $setOnInsert: {
                  staff_id: leave.staff_id,
                  staff_name: staff.name,
                  staff_role: staff.role,
                  hospital_id: staff.hospital_id,
                  district: staff.district,
                  date: dateStr,
                  source: 'manual',
                  biometric_check_in: false,
                  biometric_check_out: false,
                },
                $set: {
                  status: 'absent',   // counts as absent for attendance %
                  notes: `On approved ${leave.leave_type} (Leave ID: ${leave.leave_id})`,
                  sync_status: 'synced',
                }
              },
              { upsert: true, new: true }
            );
          }
          console.log(`[Leave] Auto-marked ${leave.total_days} day(s) as on_leave for ${staff.name}`);
        }
      } catch (attErr) {
        console.error('[Leave] Failed to auto-mark attendance:', attErr.message);
        // Don't fail the main request if attendance update fails
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Send email to staff about leave decision
    try {
      const staffInfo = await Staff.findOne({ staff_id: leave.staff_id });
      if (staffInfo && staffInfo.email) {
        await sendLeaveStatusEmail({
          staffEmail: staffInfo.email,
          staffName: staffInfo.name,
          leaveType: leave.leave_type,
          status: leave.status,
          startDate: leave.start_date,
          endDate: leave.end_date,
          remarks: leave.remarks,
          district: staffInfo.district
        });
      }
    } catch (emailErr) {
      console.error('[Leave] Failed to send status email:', emailErr.message);
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel a pending leave request
// @route   PUT /api/leave/:id/cancel
const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findOne({ leave_id: id });

    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });
    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be cancelled.' });
    }

    leave.status = 'Cancelled';
    leave.reviewed_on = new Date();
    await leave.save();

    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get leave history for a specific staff member
// @route   GET /api/leave/staff/:staff_id
const getStaffLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ staff_id: req.params.staff_id }).sort({ applied_on: -1 });
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAllLeaves, getLeaveSummary, applyLeave, reviewLeave, cancelLeave, getStaffLeaves };
