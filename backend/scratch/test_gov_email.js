require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sendAutoAlertEmail } = require('../utils/emailService');

(async () => {
  console.log('📧 Testing DDHS email delivery to .gov.in address...');
  const result = await sendAutoAlertEmail({
    district: 'Madurai',
    hospitalName: 'Test PHC',
    alertType: 'late_attendance',
    message: 'Test late message',
    severity: 'low'
  });
  console.log('Result:', result);
})();
