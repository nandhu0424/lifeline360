const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const PHCUser = require('./models/PHCUser');
require('dotenv').config();

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const patientCount = await Patient.countDocuments();
    console.log('Total patients in DB:', patientCount);

    const phcUsers = await PHCUser.find({});
    console.log('PHC Users in DB:', phcUsers.map(u => ({ username: u.username, hospital_id: u.hospital_id })));

    if (phcUsers.length > 0) {
      const firstPHC = phcUsers[0].hospital_id;
      const patientsForPHC = await Patient.countDocuments({ hospital_id: firstPHC });
      console.log(`Patients for hospital ${firstPHC}:`, patientsForPHC);
      
      const sample = await Patient.findOne({ hospital_id: firstPHC });
      console.log('Sample Patient:', sample);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkData();
