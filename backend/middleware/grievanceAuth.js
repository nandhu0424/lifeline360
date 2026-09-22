const jwt = require('jsonwebtoken');
const GrievanceStaff = require('../models/GrievanceStaff');

const grievanceProtect = async (req, res, next) => {
    let token = null;

    // 1. Check for token in Authorization Header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check for token in cookies (grievance_session)
    else if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (const c of cookies) {
            const [name, val] = c.trim().split('=');
            if (name === 'grievance_session') {
                token = val;
                break;
            }
        }
    }

    // Reject if no token is found
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. Please log in first.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lifeline360_grievance_secret_2026');
        const staff = await GrievanceStaff.findById(decoded.id).select('-password_hash');

        if (!staff) {
            return res.status(401).json({ success: false, message: 'Invalid session. Staff user not found.' });
        }

        req.staff = staff;
        next();
    } catch (error) {
        console.error('👥 Grievance Auth Error:', error.message);
        return res.status(401).json({ success: false, message: 'Session expired or invalid. Please log in again.' });
    }
};

module.exports = { grievanceProtect };
