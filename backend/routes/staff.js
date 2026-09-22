const express = require('express');
const router = express.Router();
const { getStaffList, updateStaff, createStaff, deleteStaff } = require('../controllers/staffController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getStaffList);
router.post('/', protect, createStaff);
router.put('/:id', protect, updateStaff);
router.delete('/:id', protect, deleteStaff);

module.exports = router;
