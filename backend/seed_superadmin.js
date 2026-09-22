require('dotenv').config();
const mongoose = require('mongoose');
const SuperAdmin = require('./models/SuperAdmin');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const existing = await SuperAdmin.findOne({ email: 'admin@lifeline360.gov.in' });
        if (existing) {
            console.log('⚠️  Super Admin already exists — skipping seed.');
        } else {
            const admin = await SuperAdmin.create({
                username: 'superadmin',
                email: 'admin@lifeline360.gov.in',
                password: 'Admin@123'
            });
            console.log('🎉 Super Admin created successfully!');
            console.log(`   Email   : ${admin.email}`);
            console.log(`   Password: Admin@123`);
            console.log(`   Role    : ${admin.role}`);
        }
    } catch (err) {
        console.error('❌ Seed error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

seed();
