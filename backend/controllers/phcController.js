const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const Stock = require('../models/Stock');

// @desc    Get dashboard stats for current PHC
// @route   GET /api/phc/stats
const getPHCStats = async (req, res) => {
  try {
    const { hospital_id } = req.user; // From protect middleware
    const today = new Date().toISOString().split('T')[0];

    if (!hospital_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only PHC users can access this data.' });
    }

    // Try finding by exact ID, then fallback to case-insensitive if needed
    let hospital = await Hospital.findOne({ hospital_id });
    if (!hospital) {
      hospital = await Hospital.findOne({ hospital_id: new RegExp(`^${hospital_id}$`, 'i') });
    }
    
    if (!hospital) {
      console.error(`Hospital not found: ${hospital_id}`);
      return res.status(404).json({ success: false, message: `Health Center record not found for ID: ${hospital_id}. Please contact support.` });
    }

    const attendance = await Attendance.find({ hospital_id, date: today });
    
    const present = attendance.filter(a => a.status === 'present').length;
    const total = hospital.staff_count || 0;

    // Fetch actual consultations for today
    const consultations = await Patient.countDocuments({ 
      hospital_id, 
      visit_date: today 
    });

    // Fetch deduplicated actual low stock alerts
    const stockStats = await Stock.aggregate([
      { $match: { hospital_id, type: 'medicine' } },
      { $addFields: { nameLower: { $toLower: { $trim: { input: "$medicine_name" } } } } },
      { $sort: { last_updated: -1 } },
      {
        $group: {
          _id: "$nameLower",
          status: { $first: "$status" },
          closing_stock: { $first: "$closing_stock" },
          max_capacity: { $first: "$max_capacity" }
        }
      },
      {
        $match: {
          $or: [
            { status: { $in: ['low_stock', 'critical'] } },
            { $and: [{ max_capacity: { $gt: 0 } }, { $expr: { $lt: ["$closing_stock", { $multiply: ["$max_capacity", 0.25] }] } }] }
          ]
        }
      },
      { $count: "count" }
    ]);
    const low_stock = stockStats.length > 0 ? stockStats[0].count : 0;

    res.json({
      success: true,
      data: {
        profile: {
          name: hospital.name,
          code: hospital.hospital_id,
          type: hospital.type,
          district: hospital.district,
          announcements: hospital.announcements || []
        },
        attendance: {
          present,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
          trend: 'up' // Simplified
        },
        consultations,
        low_stock
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed attendance log for current PHC
// @route   GET /api/phc/attendance
const getPHCAttendance = async (req, res) => {
  try {
    const { hospital_id } = req.user;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const attendance = await Attendance.find({ hospital_id, date }).sort({ check_in_time: -1 });

    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get OPD trend for dynamic range (Days or Year)
// @route   GET /api/phc/opd-trend
const getOPDTrend = async (req, res) => {
  try {
    const { hospital_id } = req.user;
    const days = parseInt(req.query.days) || 7;
    const isYearly = days === 365;

    // Helper: get LOCAL date string (YYYY-MM-DD) for a Date object
    // Avoids toISOString() which shifts to UTC, causing off-by-one in IST
    const localDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const localMonthStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };

    // Today's local date string
    const todayStr = localDateStr(new Date());

    // Compute start date using local arithmetic
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    const startStr = isYearly ? localMonthStr(startDate) : localDateStr(startDate);

    // Match query uses visit_date strings (already stored in YYYY-MM-DD format)
    const grouping = isYearly
      ? { $substr: ['$visit_date', 0, 7] }  // YYYY-MM
      : '$visit_date';                        // YYYY-MM-DD

    const patientStats = await Patient.aggregate([
      {
        $match: {
          hospital_id,
          visit_date: { $gte: startStr }
        }
      },
      {
        $group: {
          _id: grouping,
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in gaps using LOCAL date arithmetic
    const result = [];

    if (isYearly) {
      const current = new Date(startDate);
      current.setDate(1); // normalize to 1st of month

      const nowMonth = localMonthStr(new Date());

      while (localMonthStr(current) <= nowMonth) {
        const dateStr = localMonthStr(current);
        const match = patientStats.find(s => s._id === dateStr);
        const label = current.toLocaleDateString('en-US', { month: 'short' });
        result.push({ label, date: dateStr, count: match ? match.count : 0 });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      const current = new Date(startDate);
      current.setHours(0, 0, 0, 0);

      while (localDateStr(current) <= todayStr) {
        const dateStr = localDateStr(current);
        const match = patientStats.find(s => s._id === dateStr);
        const label = current.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        result.push({ label, date: dateStr, count: match ? match.count : 0 });
        current.setDate(current.getDate() + 1);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get recent activity for dashboard
// @route   GET /api/phc/recent-activity
const getRecentActivity = async (req, res) => {
  try {
    const { hospital_id } = req.user;

    const [attendance, patients, alerts, stocks] = await Promise.all([
      Attendance.find({ hospital_id }).sort({ createdAt: -1 }).limit(5),
      Patient.find({ hospital_id }).sort({ created_at: -1 }).limit(5),
      Alert.find({ hospital_id }).sort({ created_at: -1 }).limit(5),
      Stock.find({ hospital_id, type: 'medicine' }).sort({ last_updated: -1 }).limit(5)
    ]);

    const activities = [];

    attendance.forEach(a => {
      activities.push({
        id: a._id,
        type: 'attendance',
        title: `Staff ${a.status}: ${a.staff_name}`,
        time: a.check_in_time || a.date,
        timestamp: a.createdAt || new Date(a.date),
        icon: 'person_check'
      });
    });

    patients.forEach(p => {
      activities.push({
        id: p._id,
        type: 'patient',
        title: `New Patient: ${p.name}`,
        time: p.visit_date,
        timestamp: p.created_at,
        icon: 'patient_list'
      });
    });

    alerts.forEach(a => {
      activities.push({
        id: a._id,
        type: 'alert',
        title: a.message,
        time: new Date(a.created_at).toLocaleTimeString(),
        timestamp: a.created_at,
        icon: 'warning',
        severity: a.severity
      });
    });

    stocks.forEach(s => {
      activities.push({
        id: s._id,
        type: 'stock',
        title: `Stock Updated: ${s.medicine_name}`,
        time: new Date(s.last_updated).toLocaleTimeString(),
        timestamp: s.last_updated,
        icon: 'inventory'
      });
    });

    // Sort all by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ success: true, data: activities.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPHCStats,
  getPHCAttendance,
  getOPDTrend,
  getRecentActivity
};
