const Alert = require('../models/Alert');

// @desc    Get all alerts for district
// @route   GET /api/alerts
const getAlerts = async (req, res) => {
  try {
    const filter = { ...req.districtFilter };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;

    const alerts = await Alert.find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(req.query.limit) || 100);

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get only unresolved alerts
// @route   GET /api/alerts/unresolved
const getUnresolvedAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({
      ...req.districtFilter,
      status: { $ne: 'resolved' }
    }).sort({ severity: -1, created_at: -1 });

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get disease outbreak alerts
// @route   GET /api/alerts/disease
const getDiseaseAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({
      ...req.districtFilter,
      type: 'disease_outbreak'
    }).sort({ created_at: -1 });

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resolve an alert
// @route   PUT /api/alerts/:id/resolve
const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, ...req.districtFilter },
      { status: 'resolved', resolved_at: new Date() },
      { new: true }
    );

    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });

    res.json({ success: true, message: 'Alert resolved.', data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getAlerts, getUnresolvedAlerts, getDiseaseAlerts, resolveAlert };
