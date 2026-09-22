const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const dotenv = require('dotenv');
dotenv.config();

const contactData = [
  { hospital_id: 'MDU007', contact: '0452-2345678', email: 'mdu007.thirunagar@tnhealth.gov.in' },
  { hospital_id: 'MDU008', contact: '04543-221456', email: 'mdu008.alanganallur@tnhealth.gov.in' },
  { hospital_id: 'TNV001', contact: '0462-2336789', email: 'tnv001.palayamkottai@tnhealth.gov.in' },
  { hospital_id: 'TNV002', contact: '04633-241789', email: 'tnv002.tenkasi@tnhealth.gov.in' },
  { hospital_id: 'CHN001', contact: '044-24342567', email: 'chn001.adyar@tnhealth.gov.in' },
  { hospital_id: 'CHN002', contact: '044-28334890', email: 'chn002.teynampet@tnhealth.gov.in' },
  { hospital_id: 'MDU001', contact: '0452-2381234', email: 'mdu001@tnhealth.gov.in' },
  { hospital_id: 'MDU002', contact: '0452-2392345', email: 'mdu002@tnhealth.gov.in' },
  { hospital_id: 'PHC001', contact: '044-26453678', email: 'phc001@tnhealth.gov.in' },
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeline360').then(async () => {
  for (const item of contactData) {
    const result = await Hospital.updateOne(
      { hospital_id: item.hospital_id },
      { $set: { contact: item.contact, email: item.email } }
    );
    if (result.matchedCount > 0) {
      console.log(`✅ Updated ${item.hospital_id} → contact: ${item.contact}`);
    } else {
      console.log(`⚠️  Hospital ${item.hospital_id} not found in DB`);
    }
  }
  console.log('\n✅ All hospital contact details updated!');
  process.exit(0);
}).catch(e => { console.error('DB Error:', e); process.exit(1); });
