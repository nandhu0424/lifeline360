require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const Hospital = require('./models/Hospital');
const PHCUser = require('./models/PHCUser');

const check = async () => {
  await mongoose.connect('mongodb://localhost:27017');
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log("All databases:", dbs.databases.map(d => d.name));
  
  // Reconnect to Lifeline360_niral to show stats
  await mongoose.disconnect();
  await mongoose.connect('mongodb://localhost:27017/Lifeline360_niral');
  console.log("Connected to database:", mongoose.connection.name);

  const hospitals = await Hospital.find({});
  for (const h of hospitals) {
    const count = await Patient.countDocuments({ hospital_id: h.hospital_id });
    console.log(`Hospital ${h.hospital_id} (${h.name}): ${count} patients`);
  }

  const users = await PHCUser.find({});
  console.log("PHC Users:", users);

  process.exit(0);
};

check();
