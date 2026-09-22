const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Work = require('../models/Work');
const Alert = require('../models/Alert');
const Program = require('../models/Program');
const Hospital = require('../models/Hospital');

// @desc    Get recent notifications for DDHS bell icon
// @route   GET /api/notifications
// @access  Private (DDHS)
router.get('/', protect, async (req, res) => {
  try {
    const district = req.user.district;
    const notifications = [];

    // Fetch all hospitals in the district for name resolution
    const hospitals = await Hospital.find({ district });
    const hospitalMap = {};
    hospitals.forEach(h => {
      hospitalMap[h.hospital_id] = h.name;
    });

    // 1. Recent Work Assignments (last 30 days)
    const recentWork = await Work.find({ district })
      .sort({ created_at: -1 })
      .limit(30);

    recentWork.forEach(w => {
      const hospitalName = hospitalMap[w.assigned_to] || w.assigned_to;

      // Work was assigned
      notifications.push({
        id: `work-created-${w._id}`,
        type: 'work_assigned',
        icon: 'assignment',
        color: '#3b82f6',
        bg: '#eff6ff',
        title: `Work Assigned: ${w.title}`,
        message: `Assigned to ${hospitalName} (${w.assigned_to}) — ${w.category}, ${w.priority} Priority`,
        hospital_id: w.assigned_to,
        hospital_name: hospitalName,
        status: w.status,
        timestamp: w.created_at
      });

      // Work submitted for review
      if (w.status === 'Under Review') {
        notifications.push({
          id: `work-review-${w._id}`,
          type: 'work_submitted',
          icon: 'rate_review',
          color: '#8b5cf6',
          bg: '#f5f3ff',
          title: `Report Submitted: ${w.title}`,
          message: `${hospitalName} (${w.assigned_to}) submitted a report for review`,
          hospital_id: w.assigned_to,
          hospital_name: hospitalName,
          status: 'Under Review',
          timestamp: w.created_at,
          unread: true
        });
      }

      // Work completed
      if (w.status === 'Completed' && w.completed_at) {
        notifications.push({
          id: `work-done-${w._id}`,
          type: 'work_completed',
          icon: 'task_alt',
          color: '#10b981',
          bg: '#ecfdf5',
          title: `Task Completed: ${w.title}`,
          message: `${hospitalName} (${w.assigned_to}) — Approved & completed`,
          hospital_id: w.assigned_to,
          hospital_name: hospitalName,
          status: 'Completed',
          timestamp: w.completed_at
        });
      }

      // Work was auto-reassigned
      if (w.is_reassigned) {
        notifications.push({
          id: `work-reassigned-${w._id}`,
          type: 'work_reassigned',
          icon: 'replay',
          color: '#f59e0b',
          bg: '#fffbeb',
          title: `Auto-Reassigned: ${w.title}`,
          message: `${hospitalName} (${w.assigned_to}) missed the deadline. Reassigned #${w.reassigned_count || 1}`,
          hospital_id: w.assigned_to,
          hospital_name: hospitalName,
          status: 'Reassigned',
          timestamp: w.last_reassigned_at || w.created_at,
          unread: true
        });
      }

      // Action Required (rejected)
      if (w.status === 'Action Required') {
        notifications.push({
          id: `work-action-${w._id}`,
          type: 'work_action_required',
          icon: 'error_outline',
          color: '#ef4444',
          bg: '#fef2f2',
          title: `Action Required: ${w.title}`,
          message: `Feedback sent to ${hospitalName} (${w.assigned_to}) — Changes requested`,
          hospital_id: w.assigned_to,
          hospital_name: hospitalName,
          status: 'Action Required',
          timestamp: w.created_at
        });
      }
    });

    // 2. Recent Alerts (last 30 days)
    const recentAlerts = await Alert.find({ district })
      .sort({ created_at: -1 })
      .limit(20);

    recentAlerts.forEach(a => {
      const hospitalName = a.hospital_name || hospitalMap[a.hospital_id] || a.hospital_id;
      const typeLabels = {
        absenteeism: 'Staff Absent',
        late_attendance: 'Late Attendance',
        low_stock: 'Low Stock',
        low_opd: 'Low OPD Count',
        disease_outbreak: 'Disease Outbreak',
        stock_request: 'Stock Request',
        stock_dispatched: 'Stock Dispatched',
        stock_received: 'Stock Received',
        task_overdue: 'Task Overdue'
      };
      const severityColors = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };

      notifications.push({
        id: `alert-${a._id}`,
        type: 'alert',
        icon: a.severity === 'high' ? 'warning' : 'info',
        color: severityColors[a.severity] || '#64748b',
        bg: a.severity === 'high' ? '#fef2f2' : a.severity === 'medium' ? '#fffbeb' : '#eff6ff',
        title: `${typeLabels[a.type] || a.type}: ${hospitalName}`,
        message: a.message,
        hospital_id: a.hospital_id,
        hospital_name: hospitalName,
        status: a.status,
        timestamp: a.created_at,
        unread: a.status !== 'resolved'
      });
    });

    // 3. Recent Programs
    const recentPrograms = await Program.find()
      .sort({ created_at: -1 })
      .limit(10);

    recentPrograms.forEach(p => {
      notifications.push({
        id: `program-${p._id}`,
        type: 'program',
        icon: 'campaign',
        color: '#06b6d4',
        bg: '#ecfeff',
        title: `Program Dispatched: ${p.title}`,
        message: `Target: ${p.target_phc === 'All' ? 'All PHCs' : hospitalMap[p.target_phc] || p.target_phc} — Due: ${p.end_date || 'No deadline'}`,
        hospital_id: p.target_phc,
        hospital_name: p.target_phc === 'All' ? 'All PHCs' : (hospitalMap[p.target_phc] || p.target_phc),
        status: p.status,
        timestamp: p.created_at
      });
    });

    // Sort all notifications by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Count unread
    const unreadCount = notifications.filter(n => n.unread).length;

    res.json({
      success: true,
      unread_count: unreadCount,
      total: notifications.length,
      data: notifications.slice(0, 50) // Return top 50
    });
  } catch (error) {
    console.error('Notification fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
