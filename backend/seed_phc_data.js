const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Hospital = require('./models/Hospital');
const PHCUser = require('./models/PHCUser');

dotenv.config();

const hospitals = [
  {
    hospital_id: "MDU007",
    name: "Thirunagar UPHC",
    type: "UPHC",
    district: "Madurai",
    location: { lat: 9.8821, lng: 78.0812 },
    address: "Thirunagar, Madurai",
    staff_count: 7,
    contact: "0452-2345007",
    status: "active"
  },
  {
    hospital_id: "MDU008",
    name: "Alanganallur Sub Centre",
    type: "SUB_CENTRE",
    district: "Madurai",
    location: { lat: 10.0461, lng: 78.1408 },
    address: "Alanganallur, Madurai",
    staff_count: 2,
    contact: "0452-2345008",
    status: "active"
  },
  {
    hospital_id: "MDU009",
    name: "Kottampatti Sub Centre",
    type: "SUB_CENTRE",
    district: "Madurai",
    location: { lat: 10.3345, lng: 78.3612 },
    address: "Kottampatti, Madurai",
    staff_count: 2,
    contact: "0452-2345009",
    status: "active"
  },
  {
    hospital_id: "MDU010",
    name: "Tirumangalam Sub Centre",
    type: "SUB_CENTRE",
    district: "Madurai",
    location: { lat: 9.8234, lng: 77.9876 },
    address: "Tirumangalam, Madurai",
    staff_count: 2,
    contact: "0452-2345010",
    status: "active"
  }
];

const phcUsers = [
  { hospital_id: "MDU007", district: "Madurai", password: "phc@mdu007", email: "thirunagar.uphc@tnhealth.org" },
  { hospital_id: "MDU008", district: "Madurai", password: "phc@mdu008", email: "alanganallur.sc@tnhealth.org" },
  { hospital_id: "MDU009", district: "Madurai", password: "phc@mdu009", email: "kottampatti.sc@tnhealth.org" },
  { hospital_id: "MDU010", district: "Madurai", password: "phc@mdu010", email: "tirumangalam.sc@tnhealth.org" }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Seed Hospitals
    console.log('Seeding Hospitals...');
    await Hospital.deleteMany({ hospital_id: { $in: hospitals.map(h => h.hospital_id) } });
    await Hospital.insertMany(hospitals);
    console.log('Hospitals seeded successfully!');

    // Seed PHC Users
    console.log('Seeding PHC Users...');
    await PHCUser.deleteMany({ hospital_id: { $in: phcUsers.map(u => u.hospital_id) } });
    
    // We use a loop for PHCUsers to trigger the 'save' middleware for bcrypt hashing
    for (const userData of phcUsers) {
      const user = new PHCUser(userData);
      await user.save();
    }
    
    console.log('PHC Users seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
