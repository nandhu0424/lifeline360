const express = require('express');
const router = express.Router();
const { getWork, assignWork, submitReport, verifyWork } = require('../controllers/workController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getWork);
router.post('/', protect, assignWork);
router.post('/:id/report', protect, submitReport);
router.post('/:id/verify', protect, verifyWork);

module.exports = router;
