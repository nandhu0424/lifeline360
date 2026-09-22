const express = require('express');
const router = express.Router();
const { 
  getPatients, addPatient, bulkUploadPatients, getPatientTotal, 
  getPatientTrend, updatePatient, lookupPatient, getPatientHistory 
} = require('../controllers/patientController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getPatients);
router.get('/lookup/:identifier', protect, lookupPatient);
router.get('/history/:patient_id', protect, getPatientHistory);
router.post('/', protect, addPatient);
router.put('/:id', protect, updatePatient);
router.post('/bulk', protect, bulkUploadPatients);
router.get('/total', protect, getPatientTotal);
router.get('/trend', protect, getPatientTrend);

module.exports = router;
