const express = require('express');
const router = express.Router();
const { getAlerts, getUnresolvedAlerts, getDiseaseAlerts, resolveAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');
const { districtFilter } = require('../middleware/districtFilter');

router.use(protect, districtFilter);

router.get('/', getAlerts);
router.get('/unresolved', getUnresolvedAlerts);
router.get('/disease', getDiseaseAlerts);
router.put('/:id/resolve', resolveAlert);

module.exports = router;
