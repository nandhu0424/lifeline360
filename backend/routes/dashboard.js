const express = require('express');
const router = express.Router();
const { getDashboardStats, getChartData, getMapData } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { districtFilter } = require('../middleware/districtFilter');

router.use(protect, districtFilter);

router.get('/stats', getDashboardStats);
router.get('/chart', getChartData);
router.get('/map', getMapData);

module.exports = router;
