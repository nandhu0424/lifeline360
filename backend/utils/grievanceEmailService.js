const nodemailer = require('nodemailer');

// Use dedicated grievance email account (grievance.lifeline360@gmail.com)
const GRIEVANCE_EMAIL = process.env.GRIEVANCE_EMAIL_USER || process.env.EMAIL_USER;
const GRIEVANCE_PASS = process.env.GRIEVANCE_EMAIL_PASS || process.env.EMAIL_PASS;

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GRIEVANCE_EMAIL,
      pass: GRIEVANCE_PASS
    }
  });
};

const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Lifeline360 Grievance Portal" <${GRIEVANCE_EMAIL}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`📧 Grievance email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Grievance email sending failed:', error.message);
    return false; // don't block submission if email fails
  }
};

// The citizen form and tracking view live in the React landing page.
// Configure FRONTEND_URL in production (for example, https://lifeline360.gov.in).
const getTrackingUrl = (email, referenceId) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${frontendUrl}/?track=${encodeURIComponent(referenceId)}&email=${encodeURIComponent(email)}#contact`;
};

const sendConfirmationEmail = async (email, referenceId) => {
  const trackingUrl = getTrackingUrl(email, referenceId);
  const subject = `Your grievance has been received — ${referenceId}`;
  const body = `Dear Citizen,

Thank you for submitting your grievance. It has been registered successfully.
Reference ID: ${referenceId}
You can track the status of your grievance at any time here: ${trackingUrl}

Expected Response Window:
- Acknowledge Receipt: Within 24 hours
- Resolution: Within 7 business days

Regards,
Lifeline360 Grievance Redressal Cell`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { background-color: #00C9A7; color: white; padding: 15px; text-align: center; border-radius: 6px 6px 0 0; }
    .content { padding: 20px; }
    .button { display: inline-block; background-color: #00C9A7; color: white !important; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Lifeline360 Grievance Redressal</h2>
    </div>
    <div class="content">
      <p>Dear Citizen,</p>
      <p>Thank you for submitting your grievance. It has been registered successfully.</p>
      <p><strong>Reference ID:</strong> <span style="font-size: 1.1em; color: #00C9A7;">${referenceId}</span></p>
      <p>You can track the status of your grievance at any time by clicking the button below:</p>
      <p><a href="${trackingUrl}" class="button" target="_blank">Track Grievance</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <h3>Expected Response SLA:</h3>
      <ul>
        <li><strong>Acknowledgment:</strong> Within 24 hours</li>
        <li><strong>Resolution:</strong> Within 7 business days</li>
      </ul>
    </div>
    <div class="footer">
      <p>This is an automated email from the Lifeline360 Grievance Portal.</p>
    </div>
  </div>
</body>
</html>`;

  return await sendEmail(email, subject, body, html);
};

const sendStatusUpdateEmail = async (email, referenceId, newStatus, resolutionNote) => {
  const trackingUrl = getTrackingUrl(email, referenceId);

  // Format status for display (e.g. received -> Received, in_review -> In Review)
  const statusDisplay = newStatus === 'in_review' ? 'In Review' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

  const subject = `Update on your grievance ${referenceId}`;
  const body = `Dear Citizen,

The status of your grievance ${referenceId} has been updated to: ${statusDisplay}.
${resolutionNote ? `\nResolution update notes:\n"${resolutionNote}"\n` : ''}
You can track detailed updates here: ${trackingUrl}

Regards,
Lifeline360 Grievance Redressal Cell`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { background-color: #0f172a; color: white; padding: 15px; text-align: center; border-radius: 6px 6px 0 0; }
    .content { padding: 20px; }
    .status-badge { display: inline-block; background-color: #3b82f6; color: white; padding: 5px 12px; border-radius: 15px; font-weight: bold; }
    .note-box { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0; }
    .button { display: inline-block; background-color: #0f172a; color: white !important; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 15px; }
    .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Lifeline360 Grievance Update</h2>
    </div>
    <div class="content">
      <p>Dear Citizen,</p>
      <p>The status of your grievance <strong>${referenceId}</strong> has been updated to:</p>
      <p><span class="status-badge">${statusDisplay.toUpperCase()}</span></p>
      
      ${resolutionNote ? `
      <div class="note-box">
        <strong>Message from Grievance Cell:</strong>
        <p style="margin: 5px 0 0 0; font-style: italic;">"${resolutionNote}"</p>
      </div>` : ''}

      <p>To view full tracking details, click the button below:</p>
      <p><a href="${trackingUrl}" class="button" target="_blank">Track Grievance</a></p>
    </div>
    <div class="footer">
      <p>This is an automated email from the Lifeline360 Grievance Portal.</p>
    </div>
  </div>
</body>
</html>`;

  return await sendEmail(email, subject, body, html);
};

module.exports = {
  sendEmail,
  sendConfirmationEmail,
  sendStatusUpdateEmail
};
