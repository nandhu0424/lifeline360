const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Alert = require('../models/Alert');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Find alerts from today that failed to send
    const alerts = await Alert.find({ email_sent: false });
    const toDelete = alerts.filter(a => new Date(a.created_at) >= today).map(a => a._id);
    
    if (toDelete.length > 0) {
      const result = await Alert.deleteMany({ _id: { $in: toDelete } });
      console.log(`✅ Successfully deleted ${result.deletedCount} failed alerts from today.`);
    } else {
      console.log('ℹ️ No failed alerts found for today.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  }
})();
