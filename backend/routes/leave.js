const express = require('express');
const router = express.Router();
const {
  getAllLeaves,
  getLeaveSummary,
  applyLeave,
  reviewLeave,
  cancelLeave,
  getStaffLeaves
} = require('../controllers/leaveController');
const { protect } = require('../middleware/auth');
const { districtFilter } = require('../middleware/districtFilter');

router.use(protect);
router.use(districtFilter);

router.get('/', getAllLeaves);
router.get('/summary', getLeaveSummary);
router.get('/staff/:staff_id', getStaffLeaves);

router.post('/', applyLeave);
router.put('/:id/review', reviewLeave);
router.put('/:id/cancel', cancelLeave);

module.exports = router;
