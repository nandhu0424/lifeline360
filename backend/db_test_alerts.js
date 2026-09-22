const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Alert = require('./models/Alert');
const Stock = require('./models/Stock');

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lifeline360', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');
        const alerts = await Alert.find().sort({ created_at: -1 }).limit(5);
        console.log('Top 5 Alerts:', JSON.stringify(alerts, null, 2));

        // Let's also check Stocks that have request_status == 'requested'
        const stocks = await Stock.find({ request_status: 'requested' }).limit(5);
        console.log('Stocks requested:', JSON.stringify(stocks, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('DB Connection error:', err.stack);
        process.exit(1);
    }
}

test();
