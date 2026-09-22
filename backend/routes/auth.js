const express = require('express');
const router = express.Router();
const { login, phcLogin, verifyToken, logout, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/phc/login', phcLogin);
router.get('/verify', protect, verifyToken);
router.post('/logout', protect, logout);

// Forgot Password routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
