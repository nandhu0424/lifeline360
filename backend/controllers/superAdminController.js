const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');
const PHCUser = require('../models/PHCUser');
const User = require('../models/User');         // DDHS users
const GrievanceStaff = require('../models/GrievanceStaff');
const Hospital = require('../models/Hospital');
const Grievance = require('../models/Grievance');

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password are required' });

    try {
        const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
        if (!admin)
            return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await admin.matchPassword(password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: 'Invalid credentials' });

        if (!admin.is_active)
            return res.status(403).json({ success: false, message: 'Account is inactive' });

        const token = admin.getSignedJwtToken();
        res.json({
            success: true,
            token,
            admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
    try {
        const [phcCount, ddhsCount, hospitalCount, grievanceCount, pendingGrievances, grievanceStaffCount] =
            await Promise.all([
                PHCUser.countDocuments(),
                User.countDocuments({ role: 'DDHS' }),
                Hospital.countDocuments(),
                Grievance.countDocuments(),
                Grievance.countDocuments({ status: 'pending' }),
                GrievanceStaff.countDocuments()
            ]);

        res.json({
            success: true,
            stats: {
                phcUsers: phcCount,
                ddhsUsers: ddhsCount,
                hospitals: hospitalCount,
                totalGrievances: grievanceCount,
                pendingGrievances,
                grievanceStaff: grievanceStaffCount
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────
// PHC USERS
// ─────────────────────────────────────────
exports.getAllPHCUsers = async (req, res) => {
    try {
        const users = await PHCUser.find().select('-password').sort({ created_at: -1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createPHCUser = async (req, res) => {
    const { hospital_id, district, email, address, password } = req.body;
    if (!hospital_id || !district || !email || !password)
        return res.status(400).json({ success: false, message: 'All fields are required' });
    try {
        const user = await PHCUser.create({ hospital_id, district, email, address, password });
        const { password: _, ...userData } = user.toObject();
        res.status(201).json({ success: true, data: userData });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: 'Hospital ID or email already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePHCUser = async (req, res) => {
    const { id } = req.params;
    const { hospital_id, district, email, address, status } = req.body;
    try {
        const user = await PHCUser.findByIdAndUpdate(
            id,
            { ...(hospital_id && { hospital_id }), ...(district && { district }), ...(email && { email }), ...(typeof address !== 'undefined' && { address }), ...(status && { status }) },
            { new: true }
        ).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'PHC user not found' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.resetPHCPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    try {
        const user = await PHCUser.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'PHC user not found' });
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.togglePHCStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await PHCUser.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'PHC user not found' });
        user.status = user.status === 'active' ? 'inactive' : 'active';
        await user.save();
        res.json({ success: true, data: { _id: user._id, status: user.status } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deletePHCUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await PHCUser.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ success: false, message: 'PHC user not found' });
        res.json({ success: true, message: 'PHC user deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────
// DDHS USERS
// ─────────────────────────────────────────
exports.getAllDDHSUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'DDHS' }).select('-password').sort({ created_at: -1 });
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createDDHSUser = async (req, res) => {
    const { username, email, password, district, district_code } = req.body;
    if (!username || !email || !password || !district || !district_code)
        return res.status(400).json({ success: false, message: 'All fields are required' });
    try {
        const user = await User.create({ username, email, password, district, district_code, role: 'DDHS' });
        const { password: _, ...userData } = user.toObject();
        res.status(201).json({ success: true, data: userData });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: 'Username or email already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateDDHSUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, district, district_code, is_active } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            id,
            {
                ...(username && { username }),
                ...(email && { email }),
                ...(district && { district }),
                ...(district_code && { district_code }),
                ...(typeof is_active !== 'undefined' && { is_active })
            },
            { new: true }
        ).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'DDHS user not found' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.resetDDHSPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'DDHS user not found' });
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.toggleDDHSStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'DDHS user not found' });
        user.is_active = !user.is_active;
        await user.save();
        res.json({ success: true, data: { _id: user._id, is_active: user.is_active } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteDDHSUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ success: false, message: 'DDHS user not found' });
        res.json({ success: true, message: 'DDHS user deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────
// GRIEVANCE STAFF
// ─────────────────────────────────────────
exports.getAllGrievanceStaff = async (req, res) => {
    try {
        const staff = await GrievanceStaff.find().select('-password_hash').sort({ createdAt: -1 });
        res.json({ success: true, data: staff });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createGrievanceStaff = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ success: false, message: 'All fields are required' });
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const staff = await GrievanceStaff.create({ name, email, password_hash });
        const { password_hash: _, ...staffData } = staff.toObject();
        res.status(201).json({ success: true, data: staffData });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: 'Email already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateGrievanceStaff = async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    try {
        const staff = await GrievanceStaff.findByIdAndUpdate(
            id,
            { ...(name && { name }), ...(email && { email }) },
            { new: true }
        ).select('-password_hash');
        if (!staff) return res.status(404).json({ success: false, message: 'Grievance staff not found' });
        res.json({ success: true, data: staff });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.resetGrievanceStaffPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    try {
        const staff = await GrievanceStaff.findById(id);
        if (!staff) return res.status(404).json({ success: false, message: 'Grievance staff not found' });
        const salt = await bcrypt.genSalt(10);
        staff.password_hash = await bcrypt.hash(newPassword, salt);
        await staff.save({ validateBeforeSave: false });
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteGrievanceStaff = async (req, res) => {
    const { id } = req.params;
    try {
        const staff = await GrievanceStaff.findByIdAndDelete(id);
        if (!staff) return res.status(404).json({ success: false, message: 'Grievance staff not found' });
        res.json({ success: true, message: 'Grievance staff deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────
// HOSPITALS
// ─────────────────────────────────────────
exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find().sort({ created_at: -1 });
        res.json({ success: true, data: hospitals });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createHospital = async (req, res) => {
    const { hospital_id, name, type, district, location, address, contact, email } = req.body;
    if (!hospital_id || !name || !type || !district || !location)
        return res.status(400).json({ success: false, message: 'Required fields missing' });
    try {
        const hospital = await Hospital.create({ hospital_id, name, type, district, location, address, contact, email });
        res.status(201).json({ success: true, data: hospital });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: 'Hospital ID already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateHospital = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const hospital = await Hospital.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
        res.json({ success: true, data: hospital });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.toggleHospitalStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const hospital = await Hospital.findById(id);
        if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
        hospital.status = hospital.status === 'active' ? 'inactive' : 'active';
        await hospital.save();
        res.json({ success: true, data: { _id: hospital._id, status: hospital.status } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteHospital = async (req, res) => {
    const { id } = req.params;
    try {
        const hospital = await Hospital.findByIdAndDelete(id);
        if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });
        res.json({ success: true, message: 'Hospital deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────────────────────────────────────
// GRIEVANCES
// ─────────────────────────────────────────
exports.getAllGrievances = async (req, res) => {
    try {
        const grievances = await Grievance.find().sort({ created_at: -1 });
        res.json({ success: true, data: grievances });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateGrievanceStatus = async (req, res) => {
    const { id } = req.params;
    const { status, assigned_to, resolution_note } = req.body;
    const validStatuses = ['received', 'pending', 'in_progress', 'in_review', 'resolved', 'rejected'];
    if (status && !validStatuses.includes(status))
        return res.status(400).json({ success: false, message: 'Invalid status value' });
    try {
        const grievance = await Grievance.findByIdAndUpdate(
            id,
            {
                ...(status && { status }),
                ...(typeof assigned_to !== 'undefined' && { assigned_to }),
                ...(typeof resolution_note !== 'undefined' && { resolution_note }),
                updated_at: new Date()
            },
            { new: true }
        );
        if (!grievance) return res.status(404).json({ success: false, message: 'Grievance not found' });
        res.json({ success: true, data: grievance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
