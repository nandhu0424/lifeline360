const express = require('express');
const router = express.Router();
const { getHospitals, getHospitalDetails, sendHospitalAlert, createHospital, updateHospital } = require('../controllers/hospitalController');
const { protect } = require('../middleware/auth');
const { districtFilter } = require('../middleware/districtFilter');

router.use(protect, districtFilter);

router.get('/', getHospitals);
router.post('/', createHospital);
router.put('/:id', updateHospital);
router.get('/filter', getHospitals); // same handler, uses ?type= query
router.post('/alert', sendHospitalAlert);
router.get('/:id', getHospitalDetails);

module.exports = router;
