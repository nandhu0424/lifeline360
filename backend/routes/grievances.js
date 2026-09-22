const express = require('express');
const router = express.Router();
const {
    submitGrievance,
    trackGrievance,
    getAllGrievances,
    getGrievanceById,
    updateGrievanceState
} = require('../controllers/grievanceController');

const { grievanceProtect } = require('../middleware/grievanceAuth');
const { grievanceSubmitRateLimiter } = require('../middleware/grievanceRateLimiter');

// Public endpoints
router.post('/', grievanceSubmitRateLimiter, submitGrievance);
router.get('/track/:reference_id', trackGrievance);

// Staff endpoints (Protected)
router.get('/', grievanceProtect, getAllGrievances);
router.get('/:id', grievanceProtect, getGrievanceById);
router.patch('/:id', grievanceProtect, updateGrievanceState);

module.exports = router;
