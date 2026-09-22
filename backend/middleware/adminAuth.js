const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

const adminProtect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized — no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Access denied — Super Admin only' });
        }

        const admin = await SuperAdmin.findById(decoded.id).select('-password');
        if (!admin || !admin.is_active) {
            return res.status(401).json({ success: false, message: 'Super Admin account not found or inactive' });
        }

        req.admin = admin;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

module.exports = { adminProtect };
