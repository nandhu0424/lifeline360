const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const Hospital = require('../models/Hospital');
const Device = require('../models/Device');
const Leave = require('../models/Leave');

// @desc    Get today's attendance across all hospitals in district
// @route   GET /api/attendance/today
const getTodayAttendance = async (req, res) => {
  try {
    const { district } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const records = await Staff.aggregate([
      { $match: { district } },
      {
        $lookup: {
          from: 'attendances',
          let: { s_id: '$staff_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$staff_id', '$$s_id'] },
                    { $eq: ['$date', today] }
                  ]
                }
              }
            }
          ],
          as: 'att'
        }
      },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospital_id',
          foreignField: 'hospital_id',
          as: 'hospital_info'
        }
      },
      {
        $addFields: {
          att: { $arrayElemAt: ['$att', 0] },
          hospital_name: { $arrayElemAt: ['$hospital_info.name', 0] }
        }
      },
      {
        $project: {
          staff_id: 1,
          staff_name: '$name',
          staff_role: '$role',
          hospital_id: 1,
          hospital_name: 1,
          date: { $ifNull: ['$att.date', today] },
          check_in_time: '$att.check_in_time',
          check_out_time: '$att.check_out_time',
          status: { $ifNull: ['$att.status', 'not_marked'] },
          is_late: { $ifNull: ['$att.is_late', false] },
          is_early_checkout: { $ifNull: ['$att.is_early_checkout', false] }
        }
      },
      { $sort: { hospital_name: 1, staff_name: 1 } }
    ]);

    const total = records.length;
    let present = 0;
    let late = 0;
    let absent = 0;

    records.forEach(r => {
      // If manually marked as absent (via leave), or inherently absent
      if (r.status === 'absent' || r.status === 'not_marked') {
        absent++;
        // If they are not marked, rewrite their status in the API output to 'absent' so the frontend colors it correctly
        r.status = 'absent';
      } else if (r.is_late || r.status === 'late' || r.status === 'late_checkin') {
        late++;
      } else {
        present++;
      }
    });

    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        date: today,
        summary: { total, present, absent, late, percentage },
        records
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance for specific hospital
// @route   GET /api/attendance/hospital/:id
const getHospitalAttendance = async (req, res) => {
  try {
    const { district } = req.user;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const attendance = await Attendance.find({
      hospital_id: req.params.id,
      district,
      date
    }).sort({ staff_name: 1 });

    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get weekly/monthly attendance summary
// @route   GET /api/attendance/summary
const getAttendanceSummary = async (req, res) => {
  try {
    const { district } = req.user;
    const period = req.query.period || 'weekly'; // weekly | monthly
    const days = period === 'monthly' ? 30 : 7;

    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const records = await Attendance.aggregate([
      { $match: { district, date: { $in: dates } } },
      { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } }
    ]);

    const summaryMap = {};
    dates.forEach(d => { summaryMap[d] = { date: d, present: 0, absent: 0, late: 0, half_day: 0 }; });
    records.forEach(r => {
      if (summaryMap[r._id.date]) summaryMap[r._id.date][r._id.status] = r.count;
    });

    res.json({ success: true, data: Object.values(summaryMap) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark staff check-in
// @route   POST /api/attendance/checkin
const markCheckIn = async (req, res) => {
  try {
    const { staff_id, time, biometric_verified } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Find staff to get hospital and district info
    const staff = await Staff.findOne({ staff_id });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    let attendance = await Attendance.findOne({ staff_id, date: today });

    if (attendance) {
      return res.status(400).json({ success: false, message: 'Already checked in for today' });
    }

    attendance = new Attendance({
      staff_id,
      staff_name: staff.name,
      staff_role: staff.role,
      hospital_id: staff.hospital_id,
      district: staff.district,
      date: today,
      check_in_time: time || new Date().toLocaleTimeString('en-US', { hour12: false }),
      check_in_timestamp: new Date(),
      biometric_check_in: !!biometric_verified,
      biometric_verified: !!biometric_verified,
      status: 'present' // Basic logic, can be refined based on shift start time
    });

    await attendance.save();
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark staff check-out
// @route   POST /api/attendance/checkout
const markCheckOut = async (req, res) => {
  try {
    const { staff_id, time, biometric_verified } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ staff_id, date: today });

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Check-in record not found for today' });
    }

    const checkOutTimeStr = time || new Date().toLocaleTimeString('en-US', { hour12: false });
    const checkOutTimestamp = new Date();

    attendance.check_out_time = checkOutTimeStr;
    attendance.check_out_timestamp = checkOutTimestamp;
    attendance.biometric_check_out = !!biometric_verified;

    // Calculate total hours if check_in_timestamp exists
    if (attendance.check_in_timestamp) {
      const diffMs = checkOutTimestamp - attendance.check_in_timestamp;
      const diffHrs = diffMs / (1000 * 60 * 60);
      attendance.total_hours = parseFloat(diffHrs.toFixed(2));

      // Basic overtime calculation (assuming 8 hour shift)
      if (attendance.total_hours > 8) {
        attendance.overtime_minutes = Math.round((attendance.total_hours - 8) * 60);
      }
    }

    await attendance.save();
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle real-time push from biometric device
// @route   POST /api/attendance/push
const handleDevicePush = async (req, res) => {
  try {
    const { device_id, user_id, time, date } = req.body;

    // 1. Find staff mapped to this device and user ID
    const staff = await Staff.findOne({
      biometric_device_id: device_id,
      biometric_user_id: user_id
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: `No staff mapped to Device: ${device_id}, User: ${user_id}`
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    let attendance = await Attendance.findOne({ staff_id: staff.staff_id, date: attendanceDate });

    // ── Auto-close forgotten checkout from a PREVIOUS day ──────────────────
    // If no record exists for TODAY, check if there's an open record from a
    // previous day (has check_in but NO check_out). If so, mark it as
    // 'no_checkout' so the dashboard doesn't show a stale "present".
    if (!attendance) {
      const openPreviousRecord = await Attendance.findOne({
        staff_id: staff.staff_id,
        date: { $lt: attendanceDate },          // any date before today
        check_in_time: { $exists: true, $ne: null },
        check_out_time: { $exists: false }       // no checkout recorded
      }).sort({ date: -1 });                    // most recent first

      if (openPreviousRecord) {
        openPreviousRecord.check_out_time = null;
        openPreviousRecord.status = 'no_checkout';
        openPreviousRecord.notes = (openPreviousRecord.notes || '') +
          ` [Auto-closed: No checkout detected. Next scan on ${attendanceDate}.]`;
        await openPreviousRecord.save();
        console.log(`[Attendance] Auto-closed forgotten checkout for ${staff.name} on ${openPreviousRecord.date}`);
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    // --- Time Parsing Helper ---
    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;

      // Handle 12-hour format (e.g., "09:00 AM", "01:00 PM")
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const parts = timeStr.trim().split(/\s+/);
        if (parts.length < 2) return 0;
        const [timePart, modifier] = parts;
        let [hours, minutes] = timePart.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours * 60 + minutes;
      }

      // Handle 24-hour format (e.g., "13:00")
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };

    // Determine today's day of week and scheduled times from roster
    const dayOfWeek = new Date(attendanceDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    let scheduledStart = staff.shift_start || '09:00 AM';
    let scheduledEnd = staff.shift_end || '05:00 PM';

    if (staff.weekly_schedule && staff.weekly_schedule[dayOfWeek]) {
      const todaySchedule = staff.weekly_schedule[dayOfWeek];
      // DB stores 'start'/'end' (set from PHC roster UI), fallback to 'shift_start'/'shift_end'
      const rosterStart = todaySchedule.start || todaySchedule.shift_start;
      const rosterEnd = todaySchedule.end || todaySchedule.shift_end;
      if (rosterStart && rosterStart !== '--:--' && rosterStart !== '00:00') {
        scheduledStart = rosterStart;
      }
      if (rosterEnd && rosterEnd !== '--:--' && rosterEnd !== '00:00') {
        scheduledEnd = rosterEnd;
      }
    }

    console.log(`[Attendance] Staff: ${staff.name} | Day: ${dayOfWeek} | ScheduledStart: ${scheduledStart} | ScheduledEnd: ${scheduledEnd}`);
    if (!attendance) {
      // Create Check-In
      const checkInTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });

      // --- Dynamic Late Logic with 15-min Grace Period ---
      const checkInMinutes = parseTimeToMinutes(checkInTime);
      const shiftStartMinutes = parseTimeToMinutes(scheduledStart);
      const graceThreshold = shiftStartMinutes + 15;

      let status = 'present';
      let is_late = false;
      let late_minutes = 0;

      if (checkInMinutes > graceThreshold) {
        status = 'late_checkin';
        is_late = true;
        late_minutes = checkInMinutes - shiftStartMinutes;
      }

      attendance = new Attendance({
        staff_id: staff.staff_id,
        staff_name: staff.name,
        staff_role: staff.role,
        hospital_id: staff.hospital_id,
        district: staff.district,
        date: attendanceDate,
        check_in_time: checkInTime,
        check_in_timestamp: new Date(`${attendanceDate}T${checkInTime}`),
        biometric_check_in: true,
        source: 'biometric',
        device_id,
        device_user_id: user_id,
        status,
        is_late,
        late_minutes
      });

      await attendance.save();
      return res.json({ success: true, message: 'Check-in recorded', data: attendance });
    } else {
      // Update Check-Out
      const checkOutTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });
      const checkOutTimestamp = new Date(`${attendanceDate}T${checkOutTime}`);

      attendance.check_out_time = checkOutTime;
      attendance.check_out_timestamp = checkOutTimestamp;
      attendance.biometric_check_out = true;

      // --- Early Checkout Logic (10-min threshold) ---
      const checkOutMinutes = parseTimeToMinutes(checkOutTime);
      const shiftEndMinutes = parseTimeToMinutes(scheduledEnd);
      const earlyThreshold = shiftEndMinutes - 10;

      if (checkOutMinutes < earlyThreshold) {
        attendance.is_early_checkout = true;
        attendance.early_checkout_minutes = shiftEndMinutes - checkOutMinutes;
        // Update status logic: if already late_checkin, we keep it or combine?
        // For the dashboard to "show both", we'll check these flags in the UI.
        if (attendance.status === 'present') {
          attendance.status = 'early_checkout';
        }
      }

      if (attendance.check_in_timestamp) {
        const diffMs = checkOutTimestamp - attendance.check_in_timestamp;
        attendance.total_hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }

      await attendance.save();
      return res.json({ success: true, message: 'Check-out recorded', data: attendance });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle real-time encrypted push of attendance log package from local SQL installer
// @route   POST /api/attendance/secure-push
const handleSecureDevicePush = async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Missing encrypted payload' });
    }

    const secretKey = process.env.SYNC_SECRET || 'lifeline360_secure_sync_secret';
    const crypto = require('crypto');

    // Decrypt the payload
    let logs = [];
    try {
      const key = crypto.createHash('sha256').update(secretKey).digest();
      const textParts = payload.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      const parsed = JSON.parse(decrypted.toString());
      logs = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error('[Sync API] Decryption failed:', e);
      return res.status(400).json({ success: false, message: 'Decryption failed. Invalid sync secret.' });
    }

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const parts = timeStr.trim().split(/\s+/);
        if (parts.length < 2) return 0;
        const [timePart, modifier] = parts;
        let [hours, minutes] = timePart.split(':').map(Number);
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
        return hours * 60 + minutes;
      }
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    };

    const syncedLogIds = [];
    const failedLogIds = [];

    for (const log of logs) {
      try {
        const { id, device_id, user_id, time, date, log_type } = log;

        // Find staff mapped to this device and user ID
        const staff = await Staff.findOne({
          biometric_device_id: device_id,
          biometric_user_id: Number(user_id)
        });

        if (!staff) {
          throw new Error(`No staff mapped to Device: ${device_id}, User: ${user_id}`);
        }

        const attendanceDate = date || new Date().toISOString().split('T')[0];
        let attendance = await Attendance.findOne({ staff_id: staff.staff_id, date: attendanceDate });

        // ── LEAVE CHECK ────────────────────────────────────────────────────────
        const hasApprovedLeave = await Leave.findOne({
          staff_id: staff.staff_id,
          status: 'Approved',
          start_date: { $lte: attendanceDate },
          end_date: { $gte: attendanceDate }
        });

        if (hasApprovedLeave) {
          throw new Error(`[LEAVE REJECTED] Staff ${staff.name} is on approved leaf (${hasApprovedLeave.leave_type}). Attendance marks rejected.`);
        }
        // ───────────────────────────────────────────────────────────────────────

        // If checkout log but no attendance found for exact date, look for most recent open check-in
        if (!attendance && log_type === 'check_out') {
          attendance = await Attendance.findOne({
            staff_id: staff.staff_id,
            check_in_time: { $exists: true, $ne: null },
            check_out_time: { $exists: false }
          }).sort({ date: -1 });

          if (attendance) {
            console.log(`[Sync API] Found open check-in on ${attendance.date} for staff ${staff.staff_id}, applying checkout from ${attendanceDate}`);
          }
        }

        const scanTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });
        const scanTimestamp = new Date(`${attendanceDate}T${scanTime}`);

        console.log(`[Sync API] Processing log: staff=${staff.staff_id}, date=${attendanceDate}, log_type=${log_type}, time=${scanTime}, attendance_found=${!!attendance}`);

        // Auto-close open records from previous day
        if (!attendance) {
          const openPreviousRecord = await Attendance.findOne({
            staff_id: staff.staff_id,
            date: { $lt: attendanceDate },
            check_in_time: { $exists: true, $ne: null },
            check_out_time: { $exists: false }
          }).sort({ date: -1 });

          if (openPreviousRecord) {
            openPreviousRecord.check_out_time = null;
            openPreviousRecord.status = 'no_checkout';
            openPreviousRecord.notes = (openPreviousRecord.notes || '') +
              ` [Auto-closed: No checkout detected. Next scan on ${attendanceDate}.]`;
            await openPreviousRecord.save();
          }
        }

        // Determine Shift Details
        const dayOfWeek = new Date(attendanceDate).toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        let scheduledStart = staff.shift_start || '09:00 AM';
        let scheduledEnd = staff.shift_end || '05:00 PM';

        if (staff.weekly_schedule && staff.weekly_schedule[dayOfWeek]) {
          const todaySchedule = staff.weekly_schedule[dayOfWeek];
          const rosterStart = todaySchedule.start || todaySchedule.shift_start;
          const rosterEnd = todaySchedule.end || todaySchedule.shift_end;
          if (rosterStart && rosterStart !== '--:--' && rosterStart !== '00:00') scheduledStart = rosterStart;
          if (rosterEnd && rosterEnd !== '--:--' && rosterEnd !== '00:00') scheduledEnd = rosterEnd;
        }

        // Check if log is check_in or check_out based on log_type or existing record

        if (!attendance && (log_type === 'check_in' || !log_type)) {
          // Record Check-in
          const checkInMinutes = parseTimeToMinutes(scanTime);
          const shiftStartMinutes = parseTimeToMinutes(scheduledStart);
          const graceThreshold = shiftStartMinutes + 15;

          let status = 'present';
          let is_late = false;
          let late_minutes = 0;

          if (checkInMinutes > graceThreshold) {
            status = 'late_checkin';
            is_late = true;
            late_minutes = checkInMinutes - shiftStartMinutes;
          }

          attendance = new Attendance({
            staff_id: staff.staff_id,
            staff_name: staff.name,
            staff_role: staff.role,
            hospital_id: staff.hospital_id,
            district: staff.district,
            date: attendanceDate,
            check_in_time: scanTime,
            check_in_timestamp: scanTimestamp,
            biometric_check_in: true,
            source: 'biometric',
            device_id,
            device_user_id: user_id,
            status,
            is_late,
            late_minutes
          });
          await attendance.save();
        } else if (attendance && (log_type === 'check_out' || log_type === 'check_in' || !log_type)) {
          // If log_type is check_in but record exists, we treat it as check_out update
          // Record Check-out
          attendance.check_out_time = scanTime;
          attendance.check_out_timestamp = scanTimestamp;
          attendance.biometric_check_out = true;

          const checkOutMinutes = parseTimeToMinutes(scanTime);
          const shiftEndMinutes = parseTimeToMinutes(scheduledEnd);
          const earlyThreshold = shiftEndMinutes - 10;

          if (checkOutMinutes < earlyThreshold) {
            attendance.is_early_checkout = true;
            attendance.early_checkout_minutes = shiftEndMinutes - checkOutMinutes;
            attendance.status = 'early_checkout';
          } else {
            attendance.status = 'duty_completed';
          }

          if (attendance.check_in_timestamp) {
            const diffMs = scanTimestamp - attendance.check_in_timestamp;
            attendance.total_hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
          }
          await attendance.save();
        } else {
          // No check-in exists but got a checkout log, create it with missing check-in
          attendance = new Attendance({
            staff_id: staff.staff_id,
            staff_name: staff.name,
            staff_role: staff.role,
            hospital_id: staff.hospital_id,
            district: staff.district,
            date: attendanceDate,
            check_out_time: scanTime,
            check_out_timestamp: scanTimestamp,
            biometric_check_out: true,
            source: 'biometric',
            device_id,
            device_user_id: user_id,
            status: 'half_day',
            notes: 'Check-in scan missing. Recorded via secure sync.'
          });
          await attendance.save();
        }

        syncedLogIds.push(id);
      } catch (err) {
        console.error(`[Sync API] Failed log sync:`, err.message);
        failedLogIds.push({ id: log.id, error: err.message });
      }
    }

    res.json({ success: true, message: 'Sync complete', synced: syncedLogIds, failed: failedLogIds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sync batch attendance from PHC offline cache
// @route   POST /api/attendance/sync
const syncOfflineAttendance = async (req, res) => {
  try {
    const { records } = req.body; // Array of attendance records
    const results = { synced: [], failed: [] };

    for (const record of records) {
      try {
        const { staff_id, date, check_in_time, check_out_time } = record;

        let attendance = await Attendance.findOne({ staff_id, date });

        if (!attendance) {
          // New record from offline
          const staff = await Staff.findOne({ staff_id });
          if (!staff) throw new Error('Staff not found');

          attendance = new Attendance({
            ...record,
            staff_name: staff.name,
            staff_role: staff.role,
            hospital_id: staff.hospital_id,
            district: staff.district,
            sync_status: 'synced'
          });
        } else {
          // Update existing with offline data if newer
          if (check_out_time && !attendance.check_out_time) {
            attendance.check_out_time = check_out_time;
            attendance.biometric_check_out = true;
          }
          attendance.sync_status = 'synced';
        }

        await attendance.save();
        results.synced.push(record.local_id || staff_id);
      } catch (err) {
        results.failed.push({ id: record.local_id || record.staff_id, error: err.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get unique device IDs and hospital names for the simulator
// @route   GET /api/attendance/devices
const getPublicDevices = async (req, res) => {
  try {
    const devices = await Device.aggregate([
      {
        $lookup: {
          from: 'hospitals',
          localField: 'phc_id',
          foreignField: 'hospital_id',
          as: 'hospital'
        }
      },
      { $unwind: '$hospital' },
      {
        $project: {
          device_id: 1,
          hospital_name: '$hospital.name',
          _id: 0
        }
      }
    ]);

    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get staff mapped to a specific device for the simulator
// @route   GET /api/attendance/device-staff/:device_id
const getDeviceStaff = async (req, res) => {
  try {
    const { device_id } = req.params;
    const staff = await Staff.find({ biometric_device_id: device_id })
      .select('biometric_user_id name role hospital_id phc_id shift_start shift_end weekly_schedule -_id')
      .sort({ biometric_user_id: 1 });
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance history for specific staff member
// @route   GET /api/attendance/staff/:id
const getStaffAttendanceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await Attendance.find({ staff_id: id }).sort({ date: -1 }).limit(30);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get habitual absenteeism analytics (staff with repeated issues)
// @route   GET /api/attendance/habitual
const getHabitualAbsenteeism = async (req, res) => {
  try {
    const { district } = req.user;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const analytics = await Attendance.aggregate([
      { $match: { district, date: { $gte: startDate }, status: { $in: ['absent', 'late'] } } },
      {
        $group: {
          _id: '$staff_id',
          staff_name: { $first: '$staff_name' },
          staff_role: { $first: '$staff_role' },
          hospital_id: { $first: '$hospital_id' },
          absent_count: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late_count: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          total_incidents: { $sum: 1 }
        }
      },
      { $match: { total_incidents: { $gte: 3 } } }, // Threshold of 3 incidents in 30 days
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospital_id',
          foreignField: 'hospital_id',
          as: 'hospital'
        }
      },
      { $unwind: '$hospital' },
      {
        $project: {
          staff_id: '$_id',
          _id: 0,
          staff_name: 1,
          staff_role: 1,
          hospital_id: 1,
          hospital_name: '$hospital.name',
          absent_count: 1,
          late_count: 1,
          total_incidents: 1
        }
      },
      { $sort: { total_incidents: -1 } }
    ]);

    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Simulate scan by storing directly into local MySQL table `attendance_logs`
// @route   POST /api/attendance/simulate-local-scan
const simulateLocalScan = async (req, res) => {
  try {
    const { device_id, user_id, log_type = 'auto', time, date } = req.body;

    // 1. Fetch Staff info from MongoDB
    const staff = await Staff.findOne({
      biometric_device_id: device_id,
      biometric_user_id: Number(user_id)
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: `No staff mapped in MongoDB for Device: ${device_id}, User ID: ${user_id}`
      });
    }

    const scanDate = date || new Date().toISOString().split('T')[0];
    const scanTime = time || new Date().toLocaleTimeString('en-US', { hour12: false });

    // ── LEAVE CHECK ────────────────────────────────────────────────────────
    const hasApprovedLeave = await Leave.findOne({
      staff_id: staff.staff_id,
      status: 'Approved',
      start_date: { $lte: scanDate },
      end_date: { $gte: scanDate }
    });

    if (hasApprovedLeave) {
      return res.json({
        success: false,
        message: `[REJECTED] ${staff.name} is currently on approved leave (${hasApprovedLeave.leave_type}). Check-in not allowed.`,
        data: null
      });
    }
    // ───────────────────────────────────────────────────────────────────────

    // 2. Connect to local MySQL database
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root',
      database: process.env.MYSQL_DATABASE || 'lifeline360'
    });

    // Ensure table attendance_logs exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        device_id       VARCHAR(50)  NOT NULL,
        biometric_user_id INT        NOT NULL,
        log_type        ENUM('check_in', 'check_out') NOT NULL DEFAULT 'check_in',
        scan_time       VARCHAR(10)  NOT NULL,
        scan_date       DATE         NOT NULL,
        staff_id        VARCHAR(50),
        staff_name      VARCHAR(100),
        hospital_id     VARCHAR(50),
        synced          TINYINT(1)   NOT NULL DEFAULT 0,
        synced_at       DATETIME,
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure table attendance exists (matching Workbench schema)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS attendance (
        userid INT NOT NULL,
        username VARCHAR(100) NOT NULL,
        hospital_id INT NOT NULL,
        hospital_name VARCHAR(150) NOT NULL,
        attendance_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userid, hospital_id)
      )
    `).catch(() => { });

    // 3. Determine final log_type (check_in vs check_out) & check rapid duplicates
    let finalLogType = log_type;

    const [existingLogs] = await conn.execute(
      `SELECT log_type, scan_time, created_at 
       FROM attendance_logs 
       WHERE biometric_user_id = ? AND scan_date = ? 
       ORDER BY created_at DESC, id DESC`,
      [Number(user_id), scanDate]
    );

    if (existingLogs.length > 0) {
      const lastLog = existingLogs[0];
      const lastScanTime = new Date(lastLog.created_at).getTime();
      const nowTime = new Date().getTime();
      const diffSeconds = Math.floor((nowTime - lastScanTime) / 1000);

      // Rapid duplicate scan prevention (< 60 seconds) only when in auto mode
      if (diffSeconds < 60 && log_type === 'auto') {
        await conn.end();
        return res.json({
          success: false,
          is_duplicate: true,
          message: `[DUPLICATE SCAN PREVENTED] ${staff.name} scanned ${diffSeconds}s ago. Ignored rapid duplicate scan to prevent accidental check-out.`,
          data: { staff_name: staff.name, diffSeconds }
        });
      }

      if (log_type === 'auto') {
        // Check if staff already has an open check-in today in MySQL OR MongoDB
        let hasOpenCheckIn = existingLogs.some(l => l.log_type === 'check_in');
        if (!hasOpenCheckIn) {
          const openMongoAtt = await Attendance.findOne({
            staff_id: staff.staff_id,
            date: scanDate,
            check_in_time: { $exists: true, $ne: null },
            check_out_time: { $exists: false }
          });
          if (openMongoAtt) hasOpenCheckIn = true;
        }

        finalLogType = hasOpenCheckIn ? 'check_out' : 'check_in';
      }
    } else {
      if (log_type === 'auto') {
        // Double check MongoDB to see if staff already checked in today
        const openMongoAtt = await Attendance.findOne({
          staff_id: staff.staff_id,
          date: scanDate,
          check_in_time: { $exists: true, $ne: null },
          check_out_time: { $exists: false }
        });
        finalLogType = openMongoAtt ? 'check_out' : 'check_in';
      }
    }

    // 4. Insert record into attendance_logs table (with synced = 0)
    const [result] = await conn.execute(
      `INSERT INTO attendance_logs 
         (device_id, biometric_user_id, log_type, scan_time, scan_date, staff_id, staff_name, hospital_id, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [device_id, Number(user_id), finalLogType, scanTime, scanDate, staff.staff_id, staff.name, staff.hospital_id]
    );

    // Also populate attendance table
    const hospIdInt = parseInt(staff.hospital_id.replace(/\D/g, '')) || 1;
    await conn.execute(
      `INSERT INTO attendance (userid, username, hospital_id, hospital_name, attendance_time)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE username = VALUES(username), attendance_time = NOW()`,
      [Number(user_id), staff.name, hospIdInt, staff.hospital_id]
    ).catch(() => { });

    await conn.end();

    const actionText = finalLogType === 'check_in' ? 'CHECK-IN (In-Time)' : 'CHECK-OUT (Out-Time)';

    return res.json({
      success: true,
      message: `Marked ${actionText}! Saved to MySQL 'attendance_logs' (synced = 0). Installer will push in <5s.`,
      data: {
        insertId: result.insertId,
        log_type: finalLogType,
        staff_name: staff.name,
        staff_id: staff.staff_id,
        hospital_id: staff.hospital_id,
        scan_time: scanTime,
        scan_date: scanDate
      }
    });

  } catch (error) {
    console.error('[Simulate Local Scan Error]:', error);
    return res.status(500).json({
      success: false,
      message: `Failed to insert into local MySQL: ${error.message}`
    });
  }
};

module.exports = {
  getTodayAttendance,
  getHospitalAttendance,
  getAttendanceSummary,
  markCheckIn,
  markCheckOut,
  handleDevicePush,
  handleSecureDevicePush,
  syncOfflineAttendance,
  getPublicDevices,
  getDeviceStaff,
  getStaffAttendanceHistory,
  getHabitualAbsenteeism,
  simulateLocalScan
};

