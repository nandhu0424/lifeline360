const Hospital = require('../models/Hospital');
const Attendance = require('../models/Attendance');
const Alert = require('../models/Alert');
const Staff = require('../models/Staff');

// @desc    Get dashboard summary stats
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const { district } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const [hospitalCounts, staffCount, attendanceToday, alertsToday] = await Promise.all([
      Hospital.aggregate([
        { $match: { district, status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Staff.countDocuments({ district, is_active: true }),
      Attendance.find({ district, date: today }),
      Alert.countDocuments({ district, status: { $ne: 'resolved' }, created_at: { $gte: new Date(today) } })
    ]);

    const hospitalStats = { PHC: 0, UPHC: 0, SUB_CENTRE: 0 };
    hospitalCounts.forEach(h => { hospitalStats[h._id] = h.count; });

    const presentCount = attendanceToday.filter(a => a.status === 'present' || a.status === 'late').length;
    const absentCount = attendanceToday.filter(a => a.status === 'absent').length;

    res.json({
      success: true,
      data: {
        total_phc: hospitalStats.PHC,
        total_uphc: hospitalStats.UPHC,
        total_subcentres: hospitalStats.SUB_CENTRE,
        total_hospitals: hospitalStats.PHC + hospitalStats.UPHC + hospitalStats.SUB_CENTRE,
        total_staff: staffCount,
        doctors_present: presentCount,
        doctors_absent: absentCount,
        alerts_today: alertsToday,
        district
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats.' });
  }
};

// @desc    Get chart data (attendance + hospital distribution)
// @route   GET /api/dashboard/chart
// @access  Private
const getChartData = async (req, res) => {
  try {
    const { district } = req.user;

    // Last 7 days dates
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const [hospitalDist, attendanceTrend] = await Promise.all([
      Hospital.aggregate([
        { $match: { district, status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Attendance.aggregate([
        { $match: { district, date: { $in: dates } } },
        { $group: { _id: { date: '$date', status: '$status' }, count: { $sum: 1 } } }
      ])
    ]);

    // Format attendance trend
    const trendMap = {};
    dates.forEach(d => { trendMap[d] = { present: 0, absent: 0, late: 0 }; });
    attendanceTrend.forEach(a => {
      if (trendMap[a._id.date]) {
        const s = a._id.status;
        if (s === 'present' || s === 'late') trendMap[a._id.date].present += a.count;
        if (s === 'absent') trendMap[a._id.date].absent += a.count;
        if (s === 'late') trendMap[a._id.date].late += a.count;
      }
    });

    res.json({
      success: true,
      data: {
        hospital_distribution: hospitalDist.map(h => ({ type: h._id, count: h.count })),
        attendance_trend: dates.map(d => ({
          date: d,
          label: new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
          ...trendMap[d]
        }))
      }
    });
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ success: false, message: 'Error fetching chart data.' });
  }
};

// @desc    Get map data (hospital locations)
// @route   GET /api/dashboard/map
// @access  Private
const getMapData = async (req, res) => {
  try {
    const { district } = req.user;
    const hospitals = await Hospital.find({ district, status: 'active' }, 'hospital_id name type location address contact');

    res.json({
      success: true,
      data: hospitals
    });
  } catch (error) {
    console.error('Map data error:', error);
    res.status(500).json({ success: false, message: 'Error fetching map data.' });
  }
};

module.exports = { getDashboardStats, getChartData, getMapData };
