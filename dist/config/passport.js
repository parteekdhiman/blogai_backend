"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const user_model_1 = __importDefault(require("../models/user.model"));
// Only configure Google OAuth if credentials are provided
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `http://localhost:5000/api/v1/auth/google/callback`,
        proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(new Error('No email from Google'), undefined);
            }
            // Find or create user
            let user = await user_model_1.default.findOne({ email });
            if (!user) {
                // Create new user with OAuth
                user = await user_model_1.default.create({
                    email,
                    name: profile.displayName,
                    image: profile.photos?.[0]?.value,
                    emailVerified: new Date(), // Trust Google verification
                    role: 'USER'
                    // No password for OAuth users
                });
            }
            // Update last login
            user.lastLoginAt = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save();
            return done(null, user);
        }
        catch (error) {
            return done(error, undefined);
        }
    }));
}
else {
    console.warn('⚠️  Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET missing');
}
exports.default = passport_1.default;
