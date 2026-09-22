const express = require('express');
const router = express.Router();
const { getHospitalNameOnly } = require('../controllers/hospitalController');
const { getPHCStats, getPHCAttendance, getOPDTrend, getRecentActivity } = require('../controllers/phcController');
const { protect } = require('../middleware/auth');

// Public route for login lookup
router.get('/name/:id', getHospitalNameOnly);

// Protected PHC Dashboard routes
router.use(protect);
router.get('/stats', getPHCStats);
router.get('/attendance', getPHCAttendance);
router.get('/opd-trend', getOPDTrend);
router.get('/recent-activity', getRecentActivity);

module.exports = router;
