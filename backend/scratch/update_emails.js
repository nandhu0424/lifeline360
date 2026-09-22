const mongoose = require('mongoose');
require('dotenv').config();

async function updateEmails() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const db = mongoose.connection.db;

  // Update DDHS user (ddhs_cbe)
  const ddhsResult = await db.collection('users').updateOne(
    { username: 'ddhs_cbe' },
    { $set: { email: 'ssowndharya487@gmail.com' } }
  );
  console.log(`DDHS ddhs_cbe: ${ddhsResult.modifiedCount ? 'Email updated ✅' : 'Not found or already set'}`);

  // Update PHC user (CBE001)
  const phcResult = await db.collection('healthcenter_users').updateOne(
    { hospital_id: 'CBE001' },
    { $set: { email: 'ssowndharya487@gmail.com' } }
  );
  console.log(`PHC CBE001: ${phcResult.modifiedCount ? 'Email updated ✅' : 'Not found or already set'}`);

  // Verify
  const ddhs = await db.collection('users').findOne({ username: 'ddhs_cbe' });
  const phc = await db.collection('healthcenter_users').findOne({ hospital_id: 'CBE001' });
  console.log(`\nVerification:`);
  console.log(`  ddhs_cbe email: ${ddhs?.email}`);
  console.log(`  CBE001 email:   ${phc?.email}`);

  await mongoose.disconnect();
  console.log('\nDone!');
}

updateEmails().catch(console.error);
