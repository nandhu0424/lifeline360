const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const GrievanceStaff = require('./models/GrievanceStaff');

const dotenvPath = require('path').join(__dirname, '.env');
dotenv.config({ path: dotenvPath });

const seedGrievanceStaff = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB...');

        const email = 'admin@lifeline360.gov.in';
        const password = 'adminpassword123';
        const name = 'District Grievance Officer';

        // Delete existing grievance staff with this email to avoid duplicate error
        await GrievanceStaff.deleteMany({ email });

        const password_hash = bcrypt.hashSync(password, 10);

        const staff = new GrievanceStaff({
            email,
            password_hash,
            name
        });

        await staff.save();
        console.log(`✅ Seeded staff user successfully!`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding grievance staff:', error);
        process.exit(1);
    }
};

seedGrievanceStaff();
