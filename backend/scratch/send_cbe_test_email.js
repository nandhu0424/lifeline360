require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { sendAutoAlertEmail, sendManualAlertEmail } = require('../utils/emailService');

async function testCbeEmail() {
  console.log('🔄 Connecting to MongoDB...');
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nirallifeline360');
    console.log('✅ Connected to MongoDB.');

    // Update DDHS user for Coimbatore in DB
    const updatedUser = await User.findOneAndUpdate(
      { district: 'Coimbatore', role: 'DDHS' },
      { $set: { email: 'ssowndharya487@gmail.com' } },
      { new: true }
    );

    if (updatedUser) {
      console.log(`✅ Updated DDHS Coimbatore user in MongoDB: ${updatedUser.username} (${updatedUser.email})`);
    } else {
      console.log('ℹ️ No existing DDHS Coimbatore user found in DB to update (or database uses seed script).');
    }

    console.log('\n📧 Sending test alert email for DDHS Coimbatore to ssowndharya487@gmail.com...');
    const result = await sendAutoAlertEmail({
      district: 'Coimbatore',
      hospitalName: 'Gandhipuram UPHC',
      alertType: 'late_attendance',
      message: 'TEST ALERT: Dr. Senthil Murugan arrived late by 15 minutes at Gandhipuram UPHC, Coimbatore.',
      severity: 'medium'
    });

    if (result) {
      console.log('\n🎉 SUCCESS! Test email has been successfully sent to ssowndharya487@gmail.com');
    } else {
      console.log('\n❌ FAILED to send test email. Check console errors.');
    }

  } catch (err) {
    console.error('❌ Error executing test script:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testCbeEmail();
