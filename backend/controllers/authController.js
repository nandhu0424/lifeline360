const User = require('../models/User');
const PHCUser = require('../models/PHCUser');
const GrievanceStaff = require('../models/GrievanceStaff');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Hospital = require('../models/Hospital');
const OTP = require('../models/OTP');

// @desc    Login user (DDHS/ADMIN/GRIEVANCE_STAFF)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const loginUser = (username || email || '').trim().toLowerCase();

    if (!loginUser || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username/email and password.' });
    }

    // 1. Check if it's a Grievance Staff user first
    const staff = await GrievanceStaff.findOne({ email: loginUser });
    if (staff) {
      const isMatch = await staff.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        { id: staff._id, role: 'grievance_staff' },
        process.env.JWT_SECRET || 'lifeline360_grievance_secret_2026',
        { expiresIn: '1d' }
      );

      res.cookie('grievance_session', token, {
        httpOnly: false,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return res.json({
        success: true,
        token,
        user: {
          id: staff._id,
          email: staff.email,
          name: staff.name,
          role: 'grievance_staff'
        }
      });
    }

    // 2. Support login by username OR email for DDHS/Admin
    const user = await User.findOne({
      $or: [
        { username: loginUser },
        { email: loginUser }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    const token = user.getSignedJwtToken();

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        district: user.district,
        district_code: user.district_code,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// @desc    Login PHC user
// @route   POST /api/auth/phc/login
// @access  Public
const phcLogin = async (req, res) => {
  try {
    const { hospital_id, password } = req.body;

    if (!hospital_id || !password) {
      return res.status(400).json({ success: false, message: 'Please provide hospital ID and password.' });
    }

    const user = await PHCUser.findOne({ hospital_id: hospital_id.toUpperCase() });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    // Generate PHC-specific token
    const token = jwt.sign(
      { id: user._id, hospital_id: user.hospital_id, role: 'phc', district: user.district },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        hospital_id: user.hospital_id,
        email: user.email,
        district: user.district,
        role: 'phc'
      }
    });
  } catch (error) {
    console.error('PHC Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during PHC login.' });
  }
};

// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id || req.user.id,
      username: req.user.username || req.user.hospital_id,
      hospital_id: req.user.hospital_id,
      email: req.user.email,
      district: req.user.district,
      district_code: req.user.district_code,
      role: req.user.role
    }
  });
};

// @desc    Logout (client-side token removal, server just acknowledges)
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
};

const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    // Allow lookup by either email or identifier (username for DDHS, hospital_id for PHC)
    const identifier = email;
    let user;
    if (role === 'phc') {
      // PHC can use email or hospital_id (case‑insensitive)
      user = await PHCUser.findOne({
        $or: [
          { email: identifier },
          { hospital_id: identifier.toUpperCase() }
        ]
      });

      // Fallback: Check Hospital collection by email
      if (!user) {
        const hospital = await Hospital.findOne({ email: identifier });
        if (hospital) {
          user = await PHCUser.findOne({ hospital_id: hospital.hospital_id });
          if (user) {
            user.emailToUse = hospital.email;
          }
        }
      }
    } else {
      // DDHS can use email or username (case‑insensitive)
      user = await User.findOne({
        $or: [
          { email: identifier },
          { username: identifier.toLowerCase() }
        ]
      });

      // Fallback: Check GrievanceStaff
      if (!user) {
        user = await GrievanceStaff.findOne({ email: identifier });
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and save to database
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    const targetEmail = user.emailToUse || user.email;

    // Clear any existing OTP for this email
    await OTP.deleteMany({ email: targetEmail });

    // Store new OTP
    await OTP.create({
      email: targetEmail,
      otp: hashedOTP
    });

    const message = `Your password reset OTP is: ${otp}. It is valid for 30 seconds.`;

    try {
      await sendEmail({
        email: targetEmail,
        subject: 'Password Reset OTP - Lifeline360',
        message
      });

      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      await OTP.deleteMany({ email: targetEmail });
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, role } = req.body;

    const resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');

    // Allow lookup by email or identifier
    const identifier = email;

    // First check OTP valid and exists
    const otpRecord = await OTP.findOne({ email: identifier, otp: resetPasswordToken });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (Date.now() - new Date(otpRecord.createdAt).getTime() > 30 * 1000) {
      await OTP.deleteMany({ email: identifier });
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    let user;
    if (role === 'phc') {
      user = await PHCUser.findOne({
        $or: [
          { email: identifier },
          { hospital_id: identifier.toUpperCase() }
        ]
      });

      if (!user) {
        const hospital = await Hospital.findOne({ email: identifier });
        if (hospital) {
          user = await PHCUser.findOne({
            hospital_id: hospital.hospital_id
          });
        }
      }
    } else {
      user = await User.findOne({
        $or: [
          { email: identifier },
          { username: identifier.toLowerCase() }
        ]
      });

      if (!user) {
        user = await GrievanceStaff.findOne({ email: identifier });
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password, role } = req.body;

    const resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');

    // Lookup by email or identifier (username/hospital_id)
    const identifier = email;

    // First check OTP valid and exists
    const otpRecord = await OTP.findOne({ email: identifier, otp: resetPasswordToken });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (Date.now() - new Date(otpRecord.createdAt).getTime() > 30 * 1000) {
      if (!otpRecord.isVerified) {
        await OTP.deleteMany({ email: identifier });
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
    }

    let user;
    if (role === 'phc') {
      user = await PHCUser.findOne({
        $or: [
          { email: identifier },
          { hospital_id: identifier.toUpperCase() }
        ]
      });

      if (!user) {
        const hospital = await Hospital.findOne({ email: identifier });
        if (hospital) {
          user = await PHCUser.findOne({
            hospital_id: hospital.hospital_id
          });
        }
      }
    } else {
      user = await User.findOne({
        $or: [
          { email: identifier },
          { username: identifier.toLowerCase() }
        ]
      });

      if (!user) {
        user = await GrievanceStaff.findOne({ email: identifier });
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Delete OTP record after successful reset
    await OTP.deleteMany({ email: identifier });

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { login, phcLogin, verifyToken, logout, forgotPassword, verifyOTP, resetPassword };
