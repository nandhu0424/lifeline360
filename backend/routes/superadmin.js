const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/adminAuth');

const {
    login,
    getDashboardStats,
    // PHC
    getAllPHCUsers, createPHCUser, updatePHCUser, resetPHCPassword, togglePHCStatus, deletePHCUser,
    // DDHS
    getAllDDHSUsers, createDDHSUser, updateDDHSUser, resetDDHSPassword, toggleDDHSStatus, deleteDDHSUser,
    // Grievance Staff
    getAllGrievanceStaff, createGrievanceStaff, updateGrievanceStaff, resetGrievanceStaffPassword, deleteGrievanceStaff,
    // Hospitals
    getAllHospitals, createHospital, updateHospital, toggleHospitalStatus, deleteHospital,
    // Grievances
    getAllGrievances, updateGrievanceStatus
} = require('../controllers/superAdminController');

// Public: login
router.post('/login', login);

// All routes below require Super Admin token
router.use(adminProtect);

// Dashboard
router.get('/stats', getDashboardStats);

// PHC Users
router.get('/phc-users', getAllPHCUsers);
router.post('/phc-users', createPHCUser);
router.put('/phc-users/:id', updatePHCUser);
router.patch('/phc-users/:id/password', resetPHCPassword);
router.patch('/phc-users/:id/toggle', togglePHCStatus);
router.delete('/phc-users/:id', deletePHCUser);

// DDHS Users
router.get('/ddhs-users', getAllDDHSUsers);
router.post('/ddhs-users', createDDHSUser);
router.put('/ddhs-users/:id', updateDDHSUser);
router.patch('/ddhs-users/:id/password', resetDDHSPassword);
router.patch('/ddhs-users/:id/toggle', toggleDDHSStatus);
router.delete('/ddhs-users/:id', deleteDDHSUser);

// Grievance Staff
router.get('/grievance-staff', getAllGrievanceStaff);
router.post('/grievance-staff', createGrievanceStaff);
router.put('/grievance-staff/:id', updateGrievanceStaff);
router.patch('/grievance-staff/:id/password', resetGrievanceStaffPassword);
router.delete('/grievance-staff/:id', deleteGrievanceStaff);

// Hospitals
router.get('/hospitals', getAllHospitals);
router.post('/hospitals', createHospital);
router.put('/hospitals/:id', updateHospital);
router.patch('/hospitals/:id/toggle', toggleHospitalStatus);
router.delete('/hospitals/:id', deleteHospital);

// Grievances
router.get('/grievances', getAllGrievances);
router.patch('/grievances/:id/status', updateGrievanceStatus);

module.exports = router;
