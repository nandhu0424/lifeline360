const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeline360').then(async () => {
  const hospitals = await Hospital.find({}).select('hospital_id name contact address district type');
  console.log(JSON.stringify(hospitals, null, 2));
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
