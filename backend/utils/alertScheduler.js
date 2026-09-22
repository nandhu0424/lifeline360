const cron = require('node-cron');
const Attendance = require('../models/Attendance');
const Stock = require('../models/Stock');
const Patient = require('../models/Patient');
const DiseaseCase = require('../models/DiseaseCase');
const Hospital = require('../models/Hospital');
const Alert = require('../models/Alert');
const Work = require('../models/Work');
const User = require('../models/User');
const Leave = require('../models/Leave');
const { sendAutoAlertEmail, sendStaffAlertEmail, sendWorkReassignedEmail } = require('./emailService');


const LATE_THRESHOLD_GRACE_MINUTES = 10; // Grace period after shift start

const generateAlertId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

/**
 * Get today's date string in local server time (not UTC)
 * This avoids date mismatch for late-night IST shifts vs UTC date
 */
const getLocalToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Helper to parse shift start and add grace minutes
 */
const getShiftStartWithGrace = (shiftStartStr, graceMinutes) => {
  if (!shiftStartStr) shiftStartStr = '09:00 AM';
  const [time, modifier] = shiftStartStr.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);

  if (modifier) {
    if (hours === 12) {
      hours = modifier.toUpperCase() === 'PM' ? 12 : 0;
    } else if (modifier.toUpperCase() === 'PM') {
      hours += 12;
    }
  }

  const d = new Date(); // local server time
  d.setHours(hours, minutes + graceMinutes, 0, 0);
  return d;
};

/**
 * Check for absenteeism and late attendance after grace period
 */
const checkAttendanceAlerts = async () => {
  try {
    const now = new Date();
    const today = getLocalToday(); // use local IST date, not UTC
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[now.getDay()];

    const hospitals = await Hospital.find({ status: 'active' });

    for (const hospital of hospitals) {
      const staffInHospital = await require('../models/Staff').find({
        hospital_id: hospital.hospital_id,
        is_active: true
      });

      for (const staff of staffInHospital) {
        // Determine today's shift start
        let shiftStart = staff.shift_start;
        if (staff.weekly_schedule && staff.weekly_schedule[todayName]) {
          const todaySchedule = staff.weekly_schedule[todayName];
          if (todaySchedule.working === false) {
            continue; // Skip absenteeism check if not working today
          }
          if (todaySchedule.start) {
            shiftStart = todaySchedule.start;
          }
        }

        let existing = await Attendance.findOne({ staff_id: staff.staff_id, date: today });

        // Calculate shift start threshold
        const thresholdTime = getShiftStartWithGrace(shiftStart, LATE_THRESHOLD_GRACE_MINUTES);

        // Fire absenteeism alert ONLY at the exact minute of (shift_start + 10 min)
        // Using an exact-minute window prevents late/approximate triggering
        const isExactThresholdMinute = (
          now.getHours() === thresholdTime.getHours() &&
          now.getMinutes() === thresholdTime.getMinutes()
        );
        if (isExactThresholdMinute) {
          // Check for absenteeism (no check-in by grace period)
          if (!existing) {
            existing = new Attendance({
              staff_id: staff.staff_id,
              hospital_id: hospital.hospital_id,
              district: hospital.district,
              staff_name: staff.name,
              staff_role: staff.role,
              date: today,
              status: 'absent'
            });
            await existing.save();
          }

          if (existing.status === 'absent') {
            // ── Check if staff has an APPROVED leave for today ────────────────
            const hasApprovedLeave = await Leave.findOne({
              staff_id: staff.staff_id,
              status: 'Approved',
              start_date: { $lte: today },
              end_date: { $gte: today }
            });

            if (hasApprovedLeave) {
              // Staff is on approved leave — skip alert and email entirely
              console.log(`✅ Skipping absenteeism alert for ${staff.name}: has approved leave.`);
            } else {
              // Staff is absent without approved leave — fire alert + email
              const alertExists = await Alert.findOne({
                hospital_id: hospital.hospital_id,
                district: hospital.district,
                type: 'absenteeism',
                message: { $regex: staff.name },
                created_at: { $gte: new Date(today) }
              });

              if (!alertExists) {
                const alert = new Alert({
                  alert_id: generateAlertId('ABS'),
                  hospital_id: hospital.hospital_id,
                  hospital_name: hospital.name,
                  district: hospital.district,
                  type: 'absenteeism',
                  message: `${staff.role} ${staff.name} is absent today without prior notice at ${hospital.name}.`,
                  severity: staff.role === 'Doctor' ? 'high' : 'medium',
                  status: 'sent'
                });
                await alert.save();

                // Send email to DDHS
                await sendAutoAlertEmail({
                  district: hospital.district,
                  hospitalName: hospital.name,
                  alertType: 'absenteeism',
                  message: alert.message,
                  severity: alert.severity
                });

                // Send email directly to the staff member
                if (staff.email) {
                  await sendStaffAlertEmail({
                    staffEmail: staff.email,
                    staffName: staff.name,
                    alertType: 'absenteeism',
                    message: `You have been marked absent today (${today}) at ${hospital.name}. If this is incorrect, please contact your supervisor.`
                  });
                }

                console.log(`🔔 Absenteeism alert fired: ${staff.name} at ${hospital.name}`);
              }
            }
          }

          // Check for late attendance — matches both 'late' (manual) and 'late_checkin' (biometric)
          if (existing && (existing.status === 'late' || existing.status === 'late_checkin') && existing.is_late) {
            // Deduplication: only fire once per staff per day
            const lateAlertExists = await Alert.findOne({
              hospital_id: hospital.hospital_id,
              type: 'late_attendance',
              message: { $regex: staff.name },
              created_at: { $gte: new Date(today) }
            });

            if (!lateAlertExists) {
              const lateAlert = new Alert({
                alert_id: generateAlertId('LATE'),
                hospital_id: hospital.hospital_id,
                hospital_name: hospital.name,
                district: hospital.district,
                type: 'late_attendance',
                message: `${staff.role} ${staff.name} arrived late at ${existing.check_in_time} (${existing.late_minutes} mins late) at ${hospital.name}.`,
                severity: 'low',
                status: 'sent',
                email_sent: false
              });
              await lateAlert.save();

              const emailSent = await sendAutoAlertEmail({
                district: hospital.district,
                hospitalName: hospital.name,
                alertType: 'late_attendance',
                message: lateAlert.message,
                severity: 'low'
              });

              lateAlert.email_sent = emailSent;
              await lateAlert.save();

              // Notify staff member directly if they have an email
              if (staff.email) {
                await sendStaffAlertEmail({
                  staffEmail: staff.email,
                  staffName: staff.name,
                  alertType: 'late_attendance',
                  message: lateAlert.message
                });
              }

              console.log(`🔔 Late attendance alert fired: ${staff.name} at ${hospital.name} (${existing.late_minutes} mins late)`);
            }
          }
        } // close now >= thresholdTime condition
      }
    }
  } catch (error) {
    console.error('❌ Attendance alert check failed:', error.message);
  }
};

/**
 * Check for low and critical stock
 */
const checkStockAlerts = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const lowStocks = await Stock.find({ status: { $in: ['low_stock', 'critical'] }, type: 'medicine' });

    for (const stock of lowStocks) {
      const hospital = await Hospital.findOne({ hospital_id: stock.hospital_id });
      if (!hospital) continue;

      const alertExists = await Alert.findOne({
        hospital_id: stock.hospital_id,
        type: 'low_stock',
        message: { $regex: stock.medicine_name },
        created_at: { $gte: new Date(today) }
      });

      if (!alertExists) {
        const severity = stock.status === 'critical' ? 'high' : 'medium';
        const alert = new Alert({
          alert_id: generateAlertId('STK'),
          hospital_id: stock.hospital_id,
          hospital_name: hospital.name,
          district: stock.district,
          type: 'low_stock',
          message: `${stock.medicine_name} stock is ${stock.status.replace('_', ' ')} at ${hospital.name}. Current: ${stock.closing_stock} units (min threshold: ${stock.minimum_threshold}).`,
          severity,
          status: 'sent',
          email_sent: false
        });
        await alert.save();

        const emailSent = await sendAutoAlertEmail({
          district: stock.district,
          hospitalName: hospital.name,
          alertType: 'low_stock',
          message: alert.message,
          severity
        });

        alert.email_sent = emailSent;
        await alert.save();
        console.log(`🔔 Low stock alert: ${stock.medicine_name} at ${hospital.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Stock alert check failed:', error.message);
  }
};

/**
 * Check for low OPD count (below 70% of 7-day average)
 */
const checkOPDAlerts = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const hospitals = await Hospital.find({ status: 'active' });

    for (const hospital of hospitals) {
      // Get last 7 days avg
      const dates = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }

      const [pastCounts, todayCount] = await Promise.all([
        Patient.countDocuments({ hospital_id: hospital.hospital_id, visit_date: { $in: dates } }),
        Patient.countDocuments({ hospital_id: hospital.hospital_id, visit_date: today })
      ]);

      const dailyAvg = pastCounts / 7;
      const threshold = dailyAvg * 0.7;

      if (dailyAvg > 0 && todayCount < threshold) {
        const alertExists = await Alert.findOne({
          hospital_id: hospital.hospital_id,
          type: 'low_opd',
          created_at: { $gte: new Date(today) }
        });

        if (!alertExists) {
          const alert = new Alert({
            alert_id: generateAlertId('OPD'),
            hospital_id: hospital.hospital_id,
            hospital_name: hospital.name,
            district: hospital.district,
            type: 'low_opd',
            message: `OPD count is ${todayCount} which is below 70% of daily average (${Math.round(dailyAvg)}) at ${hospital.name}.`,
            severity: 'medium',
            status: 'sent',
            email_sent: false
          });
          await alert.save();

          const emailSent = await sendAutoAlertEmail({
            district: hospital.district,
            hospitalName: hospital.name,
            alertType: 'low_opd',
            message: alert.message,
            severity: 'medium'
          });

          alert.email_sent = emailSent;
          await alert.save();
        }
      }
    }
  } catch (error) {
    console.error('❌ OPD alert check failed:', error.message);
  }
};

/**
 * Check for disease outbreak
 */
const checkDiseaseAlerts = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cases = await DiseaseCase.find({ date: today, alert_triggered: false });

    for (const c of cases) {
      if (c.case_count > c.usual_threshold) {
        const hospital = await Hospital.findOne({ hospital_id: c.hospital_id });
        if (!hospital) continue;

        const alert = new Alert({
          alert_id: generateAlertId('DIS'),
          hospital_id: c.hospital_id,
          hospital_name: hospital.name,
          district: c.district,
          type: 'disease_outbreak',
          message: `${c.disease_name} cases increased to ${c.case_count} (usual threshold: ${c.usual_threshold}) at ${hospital.name}. Immediate action required.`,
          severity: 'high',
          status: 'sent',
          email_sent: false
        });
        await alert.save();

        const emailSent = await sendAutoAlertEmail({
          district: c.district,
          hospitalName: hospital.name,
          alertType: 'disease_outbreak',
          message: alert.message,
          severity: 'high'
        });

        alert.email_sent = emailSent;
        await alert.save();

        await DiseaseCase.findByIdAndUpdate(c._id, { alert_triggered: true });
        console.log(`🔔 Disease outbreak alert: ${c.disease_name} at ${hospital.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Disease alert check failed:', error.message);
  }
};

/**
 * Check for work assignments that missed their due date, automatically reassign them,
 * and send a notification email to the DDHS officer.
 */
const checkOverdueWorkAlerts = async () => {
  try {
    const now = new Date();
    // Start of today in local time
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Find all non-completed assignments whose due date has passed
    const overdueWorks = await Work.find({
      status: { $nin: ['Completed'] },
      due_date: { $lt: todayStart }
    });

    for (const work of overdueWorks) {
      // Calculate new due date (+7 days from current due date or today)
      const originalDueDate = work.original_due_date || work.due_date;
      const baseDate = new Date(work.due_date);
      const newDueDate = new Date(baseDate.setDate(baseDate.getDate() + 7));

      // Update work record
      work.original_due_date = originalDueDate;
      work.due_date = newDueDate;
      work.is_reassigned = true;
      work.reassigned_count = (work.reassigned_count || 0) + 1;
      work.last_reassigned_at = new Date();
      work.status = 'Pending'; // Reset status to Pending so PHC can complete and submit

      await work.save();

      // Get PHC details from Hospital collection
      const hospital = await Hospital.findOne({ hospital_id: work.assigned_to });
      const phcName = hospital ? hospital.name : work.assigned_to;
      const district = hospital ? hospital.district : (work.district || 'Unknown');

      const formattedOriginal = new Date(originalDueDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
      });

      // Save alert log to DB
      const alertId = `REASSIGN-${work._id}-${work.reassigned_count}`;
      const alert = new Alert({
        alert_id: alertId,
        hospital_id: work.assigned_to,
        hospital_name: phcName,
        district,
        type: 'task_overdue',
        message: `${phcName} didn't complete "${work.title}" by due date (${formattedOriginal}). Task automatically reassigned for another 7 days.`,
        severity: work.priority === 'High' ? 'high' : work.priority === 'Low' ? 'low' : 'medium',
        status: 'sent'
      });
      await alert.save();

      // Send email notification to DDHS office
      await sendWorkReassignedEmail({
        district,
        phcName,
        taskTitle: work.title,
        originalDueDate,
        newDueDate,
        reassignCount: work.reassigned_count
      });

      console.log(`🔄 Task auto-reassigned & DDHS email sent: "${work.title}" -> ${phcName} (${district})`);
    }
  } catch (error) {
    console.error('❌ Overdue work auto-reassignment check failed:', error.message);
  }
};

/**
 * Start all scheduled jobs
 */
const startAlertScheduler = () => {
  console.log('⏰ Alert Scheduler started...');

  // Run every 1 minute — absenteeism now fires only at the EXACT threshold minute per staff
  cron.schedule('* * * * *', async () => {
    console.log(`[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}] ⏰ Running alert checks...`);
    await checkAttendanceAlerts();
    await checkStockAlerts();
    await checkDiseaseAlerts();
  });

  // Run OPD check every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    await checkOPDAlerts();
  });

  // Check for overdue work assignments daily at midnight (12:00 AM)
  cron.schedule('0 0 * * *', async () => {
    console.log('📋 Running overdue work assignment check...');
    await checkOverdueWorkAlerts();
  });

  // Also run overdue check once at startup to catch any already-overdue tasks
  checkOverdueWorkAlerts();

  console.log('✅ Scheduler registered: attendance + stock + disease (every 1 min), OPD (every 30 min), overdue tasks (daily midnight + startup)');
};

module.exports = { startAlertScheduler, checkOverdueWorkAlerts };
