const express = require('express');
const { submitFeedback, getPublicFeedback } = require('../controllers/feedbackController');
const { feedbackSubmitRateLimiter } = require('../middleware/grievanceRateLimiter');

const router = express.Router();
router.post('/', feedbackSubmitRateLimiter, submitFeedback);
router.get('/public', getPublicFeedback);

module.exports = router;
