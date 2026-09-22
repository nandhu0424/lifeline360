/**
 * Quick Email Test — run with: node scratch/test_email.js
 * Tests: Gmail SMTP auth + the styled alert email template
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sendAutoAlertEmail } = require('../utils/emailService');

(async () => {
  console.log('🔍 EMAIL_USER :', process.env.EMAIL_USER);
  console.log('🔍 EMAIL_PASS :', process.env.EMAIL_PASS ? '✅ Loaded' : '❌ Missing');
  console.log('');
  console.log('📧 Sending test late-attendance alert email...');

  const result = await sendAutoAlertEmail({
    district: 'Madurai',
    hospitalName: 'PHC Melur',
    alertType: 'late_attendance',
    message: 'Doctor John Doe arrived late at 10:18 AM (18 mins late) at PHC Melur.',
    severity: 'low'
  });

  if (result) {
    console.log('✅ Email sent successfully! Check your inbox: gcedpilibrary6135@gmail.com');
  } else {
    console.log('❌ Email failed. Check credentials or App Password below.');
    console.log('');
    console.log('📌 Gmail Fix Steps:');
    console.log('   1. Go to: https://myaccount.google.com/apppasswords');
    console.log('   2. Create a new App Password → "Mail" → "Other (Lifeline360)"');
    console.log('   3. Copy the 16-char password (e.g. txkj ugj lv ym na hm)');
    console.log('   4. Paste it in .env as EMAIL_PASS=<paste without spaces>');
    console.log('   5. Make sure 2-Step Verification is ON for your Google account');
  }
})();
