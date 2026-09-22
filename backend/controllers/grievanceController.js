const Grievance = require('../models/Grievance');
const GrievanceStaff = require('../models/GrievanceStaff');
const jwt = require('jsonwebtoken');
const { sendConfirmationEmail, sendStatusUpdateEmail } = require('./../utils/grievanceEmailService');

// HTML Input Escaper for XSS Mitigation
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, (m) => {
        switch (m) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#x27;';
            default: return m;
        }
    });
};

/**
 * @desc    Grievance Staff Login
 * @route   POST /api/auth/login (Handled in unified login logic)
 */
const staffLogin = async (req, res) => {
    try {
        const { email, password, username } = req.body;
        const loginUser = (email || username || '').trim().toLowerCase();

        if (!loginUser || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password.' });
        }

        const staff = await GrievanceStaff.findOne({ email: loginUser });
        if (!staff) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await staff.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Sign JWT token
        const token = jwt.sign(
            { id: staff._id, role: 'grievance_staff' },
            process.env.JWT_SECRET || 'lifeline360_grievance_secret_2026',
            { expiresIn: '1d' }
        );

        // Set cookie
        res.cookie('grievance_session', token, {
            httpOnly: false, // Accessible by frontend JS for page redirects
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.json({
            success: true,
            token,
            user: {
                id: staff._id,
                email: staff.email,
                name: staff.name,
                role: 'grievance_staff'
            }
        });
    } catch (error) {
        console.error('❌ Staff Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

/**
 * @desc    Post public grievance
 * @route   POST /api/grievances
 * @access  Public
 */
const submitGrievance = async (req, res) => {
    try {
        const { name, email, phone, category, district, message } = req.body;

        // Field validations
        const errors = {};
        if (!name || !name.trim()) errors.name = 'Name is required';
        if (!email || !email.trim()) errors.email = 'Email is required';
        if (!category || !category.trim()) errors.category = 'Category is required';
        if (!message || !message.trim()) errors.message = 'Message is required';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        // Generate unique reference_id: GRV-{year}-{5-digit-sequence}
        const currentYear = new Date().getFullYear();
        let reference_id = '';
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const gteDate = new Date(currentYear, 0, 1);
            const ltDate = new Date(currentYear + 1, 0, 1);
            const count = await Grievance.countDocuments({
                created_at: { $gte: gteDate, $lt: ltDate }
            });

            const sequenceStr = String(count + 1 + attempts).padStart(5, '0');
            reference_id = `GRV-${currentYear}-${sequenceStr}`;

            // Check if duplicate exists
            const existing = await Grievance.findOne({ reference_id });
            if (!existing) {
                isUnique = true;
            } else {
                attempts++;
            }
        }

        if (!isUnique) {
            return res.status(500).json({ success: false, message: 'Could not generate a unique Reference ID.' });
        }

        // Sanitize user inputs to mitigate XSS
        const grievance = new Grievance({
            reference_id,
            name: escapeHtml(name.trim()),
            email: escapeHtml(email.trim()),
            phone: phone ? escapeHtml(phone.trim()) : '',
            category: escapeHtml(category.trim()),
            district: district ? escapeHtml(district.trim()) : '',
            message: escapeHtml(message.trim()),
            status: 'received'
        });

        await grievance.save();

        // Trigger confirmation email asynchronously (does not block response on failure)
        sendConfirmationEmail(grievance.email, reference_id).catch(err => {
            console.error('📧 Confirmation email sending failed:', err.message);
        });

        res.status(201).json({
            success: true,
            reference_id,
            status: 'received'
        });
    } catch (error) {
        console.error('❌ Grievance submission error:', error);
        res.status(500).json({ success: false, message: 'Server error during submission.' });
    }
};

/**
 * @desc    Track grievance by reference ID
 * @route   GET /api/grievances/track/:reference_id
 * @access  Public
 */
const trackGrievance = async (req, res) => {
    try {
        const term = req.params.reference_id?.trim();

        if (!term) {
            return res.status(400).json({ success: false, message: 'Please provide a Reference ID or Email.' });
        }

        const list = await Grievance.find({
            $or: [
                { reference_id: term.toUpperCase() },
                { email: { $regex: new RegExp(`^${term}$`, 'i') } }
            ]
        }).sort({ created_at: -1 });

        if (list.length === 0) {
            return res.status(404).json({ success: false, message: 'No grievances found.' });
        }

        // Return only citizen-safe fields to protect confidentiality
        const safeData = list.map(g => ({
            reference_id: g.reference_id,
            status: g.status,
            category: g.category,
            resolution_note: g.resolution_note || '',
            created_at: g.created_at,
            updated_at: g.updated_at
        }));

        res.json({ success: true, count: safeData.length, data: safeData });
    } catch (error) {
        console.error('❌ Tracking Error:', error);
        res.status(500).json({ success: false, message: 'Server error during tracking lookup.' });
    }
};

/**
 * @desc    Get all grievances (for staff dashboard)
 * @route   GET /api/grievances
 * @access  Private (Staff)
 */
const getAllGrievances = async (req, res) => {
    try {
        const { status, category, district } = req.query;
        const filter = {};

        // Bind optional filters
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (district) filter.district = district;

        const list = await Grievance.find(filter).sort({ created_at: -1 });
        res.json({ success: true, count: list.length, data: list });
    } catch (error) {
        console.error('❌ Fetch Grievances Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching grievances.' });
    }
};

/**
 * @desc    Get detailed grievance by Mongo _id
 * @route   GET /api/grievances/:id
 * @access  Private (Staff)
 */
const getGrievanceById = async (req, res) => {
    try {
        const { id } = req.params;
        const grievance = await Grievance.findById(id);

        if (!grievance) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }

        res.json({ success: true, data: grievance });
    } catch (error) {
        console.error('❌ Fetch Detail Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching grievance details.' });
    }
};

/**
 * @desc    Update Grievance resolution status
 * @route   PATCH /api/grievances/:id
 * @access  Private (Staff)
 */
const updateGrievanceState = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution_note, assigned_to } = req.body;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }

        const previousStatus = grievance.status;

        // Apply updates if defined in request
        if (status) {
            const validStatuses = ['received', 'in_review', 'resolved', 'rejected'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status value.' });
            }
            grievance.status = status;
        }

        if (resolution_note !== undefined) {
            grievance.resolution_note = escapeHtml(resolution_note.trim());
        }

        if (assigned_to !== undefined) {
            grievance.assigned_to = escapeHtml(assigned_to.trim());
        }

        await grievance.save();

        // Trigger update notification if status changed
        if (status && status !== previousStatus) {
            sendStatusUpdateEmail(
                grievance.email,
                grievance.reference_id,
                grievance.status,
                grievance.resolution_note
            ).catch(err => {
                console.error('📧 Update email sending failed:', err.message);
            });
        }

        res.json({ success: true, data: grievance });
    } catch (error) {
        console.error('❌ Update Grievance Error:', error);
        res.status(500).json({ success: false, message: 'Server error updating grievance.' });
    }
};

module.exports = {
    staffLogin,
    submitGrievance,
    trackGrievance,
    getAllGrievances,
    getGrievanceById,
    updateGrievanceState
};
