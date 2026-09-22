const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/PROJECT/Lifeline360/backend/.env' });
const Stock = require('d:/PROJECT/Lifeline360/backend/models/Stock');

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  const stocks = await Stock.find({ hospital_id: 'MDU008' });
  console.log(JSON.stringify(stocks, null, 2));
  process.exit();
}

debug();
