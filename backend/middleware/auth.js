const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PHCUser = require('../models/PHCUser');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findById(decoded.id).select('-password');
    
    // If not found in User collection, check PHCUser collection
    if (!user) {
      user = await PHCUser.findById(decoded.id).select('-password');
      if (user) {
        user = user.toObject();
        user.role = 'phc'; // Force role if not in DB
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    // Check activation status (User uses is_active, PHCUser uses status)
    const isActive = user.is_active !== undefined ? user.is_active : user.status === 'active';
    
    if (!isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is not valid or has expired.' });
  }
};

module.exports = { protect };
