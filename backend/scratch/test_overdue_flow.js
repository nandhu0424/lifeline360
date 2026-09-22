require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Work = require('../models/Work');
const Hospital = require('../models/Hospital');
const { checkOverdueWorkAlerts } = require('../utils/alertScheduler');

async function runOverdueWorkflow() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nirallifeline360');
    console.log('✅ Connected to Database.');

    // 1. Ensure hospital CBE001 exists
    let hospital = await Hospital.findOne({ hospital_id: 'CBE001' });
    if (!hospital) {
      console.log('➕ Creating test hospital CBE001 (Gandhipuram UPHC, Coimbatore)...');
      hospital = await new Hospital({
        hospital_id: 'CBE001',
        name: 'Gandhipuram UPHC',
        type: 'UPHC',
        district: 'Coimbatore',
        address: 'Gandhipuram, Coimbatore',
        contact: '0422-2301001',
        email: 'cbe001@tnhealth.gov.in',
        status: 'active'
      }).save();
    }

    // 2. Create a work assignment assigned to CBE001 with due_date = YESTERDAY
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`\n📋 DDHS Officer creating work assignment for CBE001 with due date = ${yesterday.toLocaleDateString()} (Yesterday)...`);

    const overdueTask = new Work({
      title: 'Urgent Bio-Waste Disposal Audit & Calibration',
      category: 'Compliance',
      assigned_to: 'CBE001',
      district: 'Coimbatore',
      due_date: yesterday,
      priority: 'High',
      description: 'Perform bio-medical waste log audit and calibrate equipment at Gandhipuram UPHC.',
      status: 'Pending',
      is_reassigned: false,
      reassigned_count: 0
    });

    await overdueTask.save();
    console.log(`✅ Work assignment created! ID: ${overdueTask._id}`);
    console.log(`   Task Title    : "${overdueTask.title}"`);
    console.log(`   Assigned To   : CBE001 (${hospital.name})`);
    console.log(`   District      : ${overdueTask.district}`);
    console.log(`   Due Date      : ${overdueTask.due_date.toISOString()} (Yesterday)`);
    console.log(`   Initial Status: ${overdueTask.status}`);

    // 3. Trigger overdue work check and auto-reassignment scheduler
    console.log('\n⏰ Triggering checkOverdueWorkAlerts() scheduler...');
    await checkOverdueWorkAlerts();

    // 4. Retrieve updated task details
    const updatedTask = await Work.findById(overdueTask._id);
    console.log('\n🔍 Verification Results:');
    console.log('   ----------------------------------------');
    console.log(`   Is Reassigned    : ${updatedTask.is_reassigned}`);
    console.log(`   Reassigned Count : #${updatedTask.reassigned_count}`);
    console.log(`   Original Due Date: ${updatedTask.original_due_date ? new Date(updatedTask.original_due_date).toLocaleDateString() : 'N/A'}`);
    console.log(`   New Due Date     : ${new Date(updatedTask.due_date).toLocaleDateString()} (+7 days extension)`);
    console.log(`   Status           : ${updatedTask.status}`);
    console.log('   ----------------------------------------');
    console.log('🎉 WORKFLOW COMPLETE! Check your email inbox (ssowndharya487@gmail.com) for the DDHS notification email.');

  } catch (err) {
    console.error('❌ Error executing workflow test:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runOverdueWorkflow();
