const express = require('express');
const router = express.Router();
const { getPrograms, addProgram, reportProgram } = require('../controllers/programController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getPrograms);
router.post('/', protect, addProgram);
router.post('/:id/report', protect, reportProgram);

module.exports = router;
