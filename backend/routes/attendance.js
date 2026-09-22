const express = require('express');
const router = express.Router();
const { 
  getTodayAttendance, 
  getHospitalAttendance, 
  getAttendanceSummary,
  markCheckIn,
  markCheckOut,
  handleDevicePush,
  handleSecureDevicePush,
  getPublicDevices,
  getDeviceStaff,
  syncOfflineAttendance,
  getStaffAttendanceHistory,
  getHabitualAbsenteeism,
  simulateLocalScan
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { districtFilter } = require('../middleware/districtFilter');

// Public endpoints for biometric device push and simulator lookup
router.post('/push', handleDevicePush);
router.post('/simulate-local-scan', simulateLocalScan);
router.post('/secure-push', handleSecureDevicePush);
router.get('/devices', getPublicDevices);
router.get('/device-staff/:device_id', getDeviceStaff);

// Protected endpoints
router.use(protect);

router.post('/sync', syncOfflineAttendance);

router.use(districtFilter);

router.get('/today', getTodayAttendance);
router.get('/summary', getAttendanceSummary);
router.get('/hospital/:id', getHospitalAttendance);
router.get('/staff/:id', getStaffAttendanceHistory);
router.get('/habitual', getHabitualAbsenteeism);

router.post('/checkin', markCheckIn);
router.post('/checkout', markCheckOut);

module.exports = router;
