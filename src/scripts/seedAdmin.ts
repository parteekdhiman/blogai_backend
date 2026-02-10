import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User, { Role } from '../models/user.model';

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@example.com';
    const adminPassword = 'adminpassword123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('⚠️ Admin account already exists.');
      // Update to ensure it has admin role just in case
      existingAdmin.role = Role.ADMIN;
      existingAdmin.password = hashedPassword; // Reset password to known one
      await existingAdmin.save();
      console.log('🔄 Updated existing admin account with new password and role.');
    } else {
      // Create new admin
      await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        emailVerified: new Date(),
        loginCount: 0,
      });
      console.log('✅ Admin account created successfully.');
    }

    console.log('-----------------------------------');
    console.log('👤 Email: ' + adminEmail);
    console.log('🔑 Password: ' + adminPassword);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedAdmin();
