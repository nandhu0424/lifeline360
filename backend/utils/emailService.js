const nodemailer = require('nodemailer');

// Map district -> DDHS email for "From" display name
const districtEmailMap = {
  'Madurai': 'ddhs.madurai@tn.gov.in',
  'Tirunelveli': 'ddhs.tirunelveli@tn.gov.in',
  'Chennai': 'ddhs.chennai@tn.gov.in',
  'Coimbatore': 'ssowndharya487@gmail.com'
};

// Create transporter (single Gmail relay with per-district display name)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const getDistrictFromEmail = (email) => {
  for (const [district, distEmail] of Object.entries(districtEmailMap)) {
    if (email === distEmail) return district;
  }
  return null;
};

/**
 * Send auto-alert email (from scheduler) — appears to come from district's DDHS email
 */
const sendAutoAlertEmail = async ({ district, hospitalName, alertType, message, severity }) => {
  try {
    const transporter = createTransporter();
    const fromEmail = districtEmailMap[district] || process.env.EMAIL_USER;
    const toEmail = fromEmail; // alerts go TO the DDHS officer of that district

    const subjectMap = {
      absenteeism: `🔴 Staff Absent Alert - ${hospitalName}`,
      late_attendance: `🟡 Late Attendance Alert - ${hospitalName}`,
      low_stock: `🟠 Low Medicine Stock Alert - ${hospitalName}`,
      low_opd: `🔵 Low OPD Count Alert - ${hospitalName}`,
      disease_outbreak: `🚨 Disease Outbreak Alert - ${hospitalName}`
    };

    const severityColors = { high: '#dc2626', medium: '#f59e0b', low: '#3b82f6' };
    const color = severityColors[severity] || '#64748b';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 30px; text-align: center; }
  .header h1 { color: #00C9A7; margin: 0; font-size: 24px; letter-spacing: 1px; }
  .header p { color: #94a3b8; margin: 5px 0 0; font-size: 14px; }
  .severity-badge { display: inline-block; background: ${color}; color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 15px 0; }
  .body { padding: 30px; }
  .alert-box { background: #f8fafc; border-left: 4px solid ${color}; border-radius: 4px; padding: 20px; margin: 20px 0; }
  .alert-box p { margin: 0; color: #334155; font-size: 15px; line-height: 1.6; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
  .info-row .label { color: #64748b; font-size: 13px; }
  .info-row .value { color: #1e293b; font-weight: 600; font-size: 13px; }
  .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
  .footer strong { color: #00C9A7; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Lifeline360</h1>
      <p>District Health Monitoring System — Alert Notification</p>
    </div>
    <div class="body">
      <div style="text-align:center;">
        <span class="severity-badge">${severity.toUpperCase()} SEVERITY</span>
      </div>
      <div class="alert-box">
        <p>${message}</p>
      </div>
      <div class="info-row"><span class="label">District</span><span class="value">${district}</span></div>
      <div class="info-row"><span class="label">Hospital</span><span class="value">${hospitalName}</span></div>
      <div class="info-row"><span class="label">Alert Type</span><span class="value">${alertType.replace(/_/g, ' ').toUpperCase()}</span></div>
      <div class="info-row"><span class="label">Date & Time</span><span class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span></div>
      <p style="color:#64748b;font-size:13px;margin-top:20px;">⚠️ This is an automated alert from the Lifeline360 system. Please take appropriate action.</p>
    </div>
    <div class="footer">
      <p>This email was sent automatically from <strong>Lifeline360 DDHS Dashboard</strong></p>
      <p>District: ${district} | ${fromEmail}</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"DDHS ${district} - Lifeline360" <${process.env.EMAIL_USER}>`,
      to: [toEmail, process.env.EMAIL_USER], // Send to officer AND a copy to the relay account for monitoring
      replyTo: fromEmail,
      subject: subjectMap[alertType] || `Alert - ${hospitalName}`,
      html
    });

    console.log(`📧 Auto-alert email sent to DDHS ${district} (${toEmail})`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
};

/**
 * Send MANUAL alert email — DDHS officer explicitly sends email about a specific hospital
 * Appears to come from the district's DDHS email
 */
const sendManualAlertEmail = async ({ districtEmail, district, hospitalName, subject, message }) => {
  try {
    const transporter = createTransporter();
    const fromEmail = districtEmailMap[district] || districtEmail || process.env.EMAIL_USER;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 30px; text-align: center; }
  .header h1 { color: #00C9A7; margin: 0; font-size: 24px; }
  .header p { color: #94a3b8; margin: 5px 0 0; font-size: 14px; }
  .body { padding: 30px; }
  .badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin: 10px 0; }
  .msg-box { background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 20px; margin: 20px 0; }
  .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
  .footer strong { color: #00C9A7; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Lifeline360</h1>
      <p>DDHS ${district} — Official Communication</p>
    </div>
    <div class="body">
      <span class="badge">MANUAL ALERT</span>
      <div class="msg-box">
        <p style="margin:0;color:#1e293b;font-size:15px;line-height:1.7;">${message}</p>
      </div>
      <p style="color:#64748b;font-size:13px;"><strong>Hospital:</strong> ${hospitalName}</p>
      <p style="color:#64748b;font-size:13px;"><strong>Sent by:</strong> DDHS ${district}</p>
      <p style="color:#64748b;font-size:13px;"><strong>Date & Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>
    <div class="footer">
      <p>Sent via <strong>Lifeline360 DDHS Dashboard</strong> | ${district} District Health Office</p>
      <p>From: ${fromEmail}</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"DDHS ${district}" <${process.env.EMAIL_USER}>`,
      to: fromEmail,
      replyTo: fromEmail,
      subject,
      html
    });

    console.log(`📧 Manual alert sent from DDHS ${district}`);
    return true;
  } catch (error) {
    console.error('❌ Manual email failed:', error.message);
    return false;
  }
};

/**
 * Send alert email to the STAFF member directly
 */
const sendStaffAlertEmail = async ({ staffEmail, staffName, alertType, message }) => {
  try {
    if (!staffEmail) return false;

    const transporter = createTransporter();

    const subjectMap = {
      absenteeism: `📢 Attendance Notification: Absent Today - ${staffName}`,
      late_attendance: `⚠️ Attendance Notification: Late Entry - ${staffName}`
    };

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
  .container { max-width: 550px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  .header { background: #0f172a; padding: 20px; text-align: center; }
  .header h2 { color: #00C9A7; margin: 0; font-size: 20px; }
  .body { padding: 30px; color: #334155; }
  .msg-box { background: #f1f5f9; border-radius: 6px; padding: 15px; margin: 20px 0; font-style: italic; }
  .footer { padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h2>Lifeline360 Attendance</h2></div>
    <div class="body">
      <p>Dear <strong>${staffName}</strong>,</p>
      <p>This is an automated notification regarding your attendance status for today:</p>
      <div class="msg-box">${message}</div>
      <p>If you believe this is an error or have prior permission, please contact your hospital administrator.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Lifeline360 Monitoring System.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Lifeline360 Attendance" <${process.env.EMAIL_USER}>`,
      to: staffEmail,
      subject: subjectMap[alertType] || `Attendance Alert`,
      html
    });

    console.log(`📧 Direct alert email sent to staff: ${staffName} (${staffEmail})`);
    return true;
  } catch (error) {
    console.error('❌ Staff email sending failed:', error.message);
    return false;
  }
};

/**
 * Send email notification to DDHS when work assignment is auto-reassigned due to overdue status
 */
const sendWorkReassignedEmail = async ({ district, phcName, taskTitle, originalDueDate, newDueDate, reassignCount }) => {
  try {
    const transporter = createTransporter();
    const fromEmail = districtEmailMap[district] || process.env.EMAIL_USER;
    const toEmail = fromEmail;

    const formattedOriginal = new Date(originalDueDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
    });
    const formattedNew = new Date(newDueDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
    });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f1f5f9; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 25px; text-align: center; }
  .header h1 { color: #00C9A7; margin: 0; font-size: 22px; }
  .header p { color: #94a3b8; margin: 5px 0 0; font-size: 13px; }
  .body { padding: 25px; }
  .badge { display: inline-block; background: #f59e0b; color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .msg-box { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 18px; margin: 15px 0; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .footer { background: #f8fafc; padding: 15px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Lifeline360</h1>
      <p>DDHS ${district} — Work Auto-Reassignment Notification</p>
    </div>
    <div class="body">
      <div style="text-align:center;"><span class="badge">TASK AUTO-REASSIGNED</span></div>
      <div class="msg-box">
        <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
          <strong>${phcName}</strong> didn't complete the assigned work <strong>"${taskTitle}"</strong> by the due date (${formattedOriginal}). The task has been automatically reassigned to them with a new deadline.
        </p>
      </div>
      <div class="info-row"><span style="color:#64748b;">PHC Name:</span><span style="font-weight:700;">${phcName}</span></div>
      <div class="info-row"><span style="color:#64748b;">Task Title:</span><span style="font-weight:700;">${taskTitle}</span></div>
      <div class="info-row"><span style="color:#64748b;">Original Due Date:</span><span style="font-weight:700;color:#dc2626;">${formattedOriginal}</span></div>
      <div class="info-row"><span style="color:#64748b;">New Extended Due Date:</span><span style="font-weight:700;color:#16a34a;">${formattedNew}</span></div>
      <div class="info-row"><span style="color:#64748b;">Reassignment Count:</span><span style="font-weight:700;">#${reassignCount}</span></div>
    </div>
    <div class="footer">
      <p>Automated notification from <strong>Lifeline360 DDHS Work Manager</strong></p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"DDHS ${district} - Work System" <${process.env.EMAIL_USER}>`,
      to: [toEmail, process.env.EMAIL_USER],
      replyTo: fromEmail,
      subject: `🔄 Task Auto-Reassigned: ${taskTitle} (${phcName})`,
      html
    });

    console.log(`📧 Work reassigned notification email sent to DDHS ${district} (${toEmail})`);
    return true;
  } catch (error) {
    console.error('❌ Work reassigned email failed:', error.message);
    return false;
  }
};/**
 * Send email to staff when leave is approved or rejected
 */
const sendLeaveStatusEmail = async ({ staffEmail, staffName, leaveType, status, startDate, endDate, remarks, district }) => {
  try {
    if (!staffEmail) return false;

    const transporter = createTransporter();

    // Check if status string contains "Approved"
    const isApproved = status.includes('Approved');
    const color = isApproved ? '#10b981' : '#ef4444'; // Green or Red
    const statusText = isApproved ? 'APPROVED' : 'REJECTED';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
  .container { max-width: 550px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  .header { background: #0f172a; padding: 20px; text-align: center; }
  .header h2 { color: #00C9A7; margin: 0; font-size: 20px; }
  .body { padding: 30px; color: #334155; }
  .status-badge { display: inline-block; background: ${color}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
  .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .info-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
  .info-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
  .footer { padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
</style></head>
<body>
  <div class="container">
    <div class="header"><h2>Lifeline360 Leave Management</h2></div>
    <div class="body">
      <p>Dear <strong>${staffName}</strong>,</p>
      <p>Your recent leave request has been reviewed by the DDHS office (${district}).</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <span class="status-badge">LEAVE ${statusText}</span>
      </div>

      <table class="info-table">
        <tr><td>Leave Type</td><td>${leaveType}</td></tr>
        <tr><td>From</td><td>${startDate}</td></tr>
        <tr><td>To</td><td>${endDate}</td></tr>
        ${remarks ? `<tr><td>Remarks</td><td>${remarks}</td></tr>` : ''}
      </table>
      
      <p style="font-size: 13px; color: #64748b; margin-top: 25px;">If you have any questions regarding this decision, please contact your DDHS office.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from the Lifeline360 DDHS Dashboard.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Lifeline360 Leaves" <${process.env.EMAIL_USER}>`,
      to: staffEmail,
      subject: `Leave Request ${statusText} - ${leaveType}`,
      html
    });

    console.log(`📧 Leave status email sent to staff: ${staffName} (${staffEmail}) - ${statusText}`);
    return true;
  } catch (error) {
    console.error('❌ Leave email sending failed:', error.message);
    return false;
  }
};

module.exports = { sendAutoAlertEmail, sendManualAlertEmail, sendStaffAlertEmail, sendWorkReassignedEmail, sendLeaveStatusEmail, districtEmailMap };
