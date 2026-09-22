require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Work = require('../models/Work');
const Hospital = require('../models/Hospital');
const Alert = require('../models/Alert');
const { startAlertScheduler } = require('../utils/alertScheduler');

const runTest = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find any past due work or create a dummy overdue work
    const existingOverdue = await Work.findOne({ status: { $nin: ['Completed'] } });
    if (existingOverdue) {
      console.log('Found existing task:', existingOverdue.title, 'Due:', existingOverdue.due_date);
    }

    console.log('Test completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(1);
  }
};

runTest();
