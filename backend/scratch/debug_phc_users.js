const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/PROJECT/Lifeline360/backend/.env' });
const PHCUser = require('d:/PROJECT/Lifeline360/backend/models/PHCUser');

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await PHCUser.find({});
  console.log(JSON.stringify(users, null, 2));
  process.exit();
}

debug();
