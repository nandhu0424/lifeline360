const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Alert = require('./models/Alert');

async function addTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifeline360', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        // add test
        const newAlert = await Alert.create({
            alert_id: `SR-${Date.now()}`,
            hospital_id: 'MDU007',
            district: 'Madurai',
            type: 'stock_request',
            message: `Test Stock request for Paracetamol from MDU007`,
            severity: 'medium',
            status: 'pending'
        });

        console.log('Added alert:', newAlert);

        // Read top alert
        const getAlerts = await Alert.find({ district: 'Madurai' }).sort({ created_at: -1 }).limit(1);
        console.log('Top Madurai Alert:', getAlerts);

        process.exit(0);
    } catch (err) {
        console.error('DB Connection error:', err.stack);
        process.exit(1);
    }
}

addTest();
