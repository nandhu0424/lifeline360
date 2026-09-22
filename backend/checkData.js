require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const check = async () => {
  await connectDB();
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log("Users:", users.map(u => ({ role: u.role, hospital_id: u.hospital_id, phc_id: u.phc_id, district: u.district })));
  
  const patients = await db.collection('patients').find({}).toArray();
  console.log("Patients count:", patients.length);

  process.exit(0);
};
check();
