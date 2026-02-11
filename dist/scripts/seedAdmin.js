"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_model_1 = __importStar(require("../models/user.model"));
// Load environment variables
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        const adminEmail = 'admin@example.com';
        const adminPassword = 'adminpassword123';
        const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 10);
        // Check if admin already exists
        const existingAdmin = await user_model_1.default.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('⚠️ Admin account already exists.');
            // Update to ensure it has admin role just in case
            existingAdmin.role = user_model_1.Role.ADMIN;
            existingAdmin.password = hashedPassword; // Reset password to known one
            await existingAdmin.save();
            console.log('🔄 Updated existing admin account with new password and role.');
        }
        else {
            // Create new admin
            await user_model_1.default.create({
                name: 'Super Admin',
                email: adminEmail,
                password: hashedPassword,
                role: user_model_1.Role.ADMIN,
                emailVerified: new Date(),
                loginCount: 0,
            });
            console.log('✅ Admin account created successfully.');
        }
        console.log('-----------------------------------');
        console.log('👤 Email: ' + adminEmail);
        console.log('🔑 Password: ' + adminPassword);
        console.log('-----------------------------------');
    }
    catch (error) {
        console.error('❌ Error seeding admin:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    }
};
seedAdmin();
