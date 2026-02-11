"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.logoutAllDevices = exports.logoutUser = exports.requestPasswordReset = exports.refreshTokenService = exports.loginUser = exports.resendVerificationEmail = exports.verifyUserEmail = exports.registerUser = void 0;
const user_model_1 = __importDefault(require("@/models/user.model"));
const token_model_1 = require("@/models/token.model");
const audit_model_1 = require("@/models/audit.model");
const bcrypt_1 = require("@/utils/bcrypt");
const email_service_1 = require("@/services/email.service");
const errors_1 = require("@/utils/errors");
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("@/config/redis");
const jwt_1 = require("@/utils/jwt");
const mongoose_1 = __importDefault(require("mongoose"));
const registerUser = async (input) => {
    const { name, email, password } = input;
    // Rate limiting
    const rateLimitKey = `register:${email}`;
    const { allowed } = await (0, redis_1.checkRateLimit)(rateLimitKey, 3, 3600); // 3 per hour
    if (!allowed) {
        throw new errors_1.ApiError(429, 'Too many registration attempts. Try again later.');
    }
    // Check if user exists
    const existingUser = await user_model_1.default.findOne({ email });
    if (existingUser) {
        throw new errors_1.ApiError(409, 'Email already registered');
    }
    // Hash password
    const hp = await (0, bcrypt_1.hashPassword)(password);
    // Generate verification token
    const verificationToken = crypto_1.default.randomUUID();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    // MongoDB Transaction (if Replica Set is enabled)
    // For standalone, we can just do two operations. 
    // We'll use a session for best practice in case you have a replica set.
    const session = await mongoose_1.default.startSession();
    let user;
    try {
        session.startTransaction();
        // Create User
        const [newUser] = await user_model_1.default.create([{
                name,
                email,
                password: hp,
                role: 'USER'
            }], { session });
        // Create Verification Token
        await token_model_1.VerificationTokenModel.create([{
                identifier: email,
                token: verificationToken,
                expires: tokenExpiry
            }], { session });
        await session.commitTransaction();
        user = newUser;
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
    // Send verification email
    (0, email_service_1.sendVerificationEmail)(email, verificationToken).catch(err => {
        // console.error needs to be replaced with logger, but keeping as is for now + logger usage if possible
        console.error('Failed to send verification email:', err);
    });
    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
        },
        message: 'Verification email sent'
    };
};
exports.registerUser = registerUser;
const verifyUserEmail = async (token) => {
    // Find token
    const verificationToken = await token_model_1.VerificationTokenModel.findOne({ token });
    if (!verificationToken) {
        throw new errors_1.ApiError(404, 'Invalid or expired verification token');
    }
    // Check expiry (handled by TTL mostly, but explicit check is good)
    if (verificationToken.expires < new Date()) {
        await token_model_1.VerificationTokenModel.deleteOne({ token });
        throw new errors_1.ApiError(410, 'Verification token expired');
    }
    // Find user
    const user = await user_model_1.default.findOne({ email: verificationToken.identifier });
    if (!user) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    if (user.emailVerified) {
        throw new errors_1.ApiError(400, 'Email already verified');
    }
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        user.emailVerified = new Date();
        await user.save({ session });
        await token_model_1.VerificationTokenModel.deleteOne({ token }, { session });
        await session.commitTransaction();
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
    // Send welcome email
    (0, email_service_1.sendWelcomeEmail)(user.email, user.name || 'User').catch(console.error);
    return true;
};
exports.verifyUserEmail = verifyUserEmail;
const resendVerificationEmail = async (email) => {
    // Rate limit
    const rateLimitKey = `resend_verify:${email}`;
    const { allowed } = await (0, redis_1.checkRateLimit)(rateLimitKey, 3, 3600);
    if (!allowed) {
        throw new errors_1.ApiError(429, 'Too many requests. Try again later.');
    }
    const user = await user_model_1.default.findOne({ email });
    if (!user) {
        return true;
    }
    if (user.emailVerified) {
        throw new errors_1.ApiError(400, 'Email already verified');
    }
    // Delete old tokens
    await token_model_1.VerificationTokenModel.deleteMany({ identifier: email });
    // Generate new token
    const token = crypto_1.default.randomUUID();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await token_model_1.VerificationTokenModel.create({
        identifier: email,
        token,
        expires: expiry
    });
    await (0, email_service_1.sendVerificationEmail)(email, token);
    return true;
};
exports.resendVerificationEmail = resendVerificationEmail;
const loginUser = async (input) => {
    const { email, password, ip, userAgent } = input;
    const _redis = redis_1.redis; // Local alias for type narrowing
    // 1. Rate limiting
    const rateLimitKey = `login_attempts:${email}`;
    const { allowed, remaining } = await (0, redis_1.checkRateLimit)(rateLimitKey, 5, 900);
    if (!allowed) {
        throw new errors_1.ApiError(429, 'Too many login attempts. Please try again in 15 minutes.');
    }
    // 2. Check account lockout
    const lockoutKey = `account_locked:${email}`;
    if (_redis) {
        const isLocked = await _redis.get(lockoutKey);
        if (isLocked) {
            throw new errors_1.ApiError(423, 'Account temporarily locked. Try again later.');
        }
    }
    // 3. Find user (Must explicitly select password as we set select: false in schema)
    const user = await user_model_1.default.findOne({ email }).select('+password');
    if (!user || !user.password) {
        if (_redis) {
            await _redis.incr(rateLimitKey);
            await _redis.expire(rateLimitKey, 900);
        }
        throw new errors_1.ApiError(401, 'Invalid credentials');
    }
    // 4. Check email verification
    if (!user.emailVerified && process.env.NODE_ENV !== 'development') {
        throw new errors_1.ApiError(403, 'Please verify your email before logging in');
    }
    // 5. Verify password
    const isValid = await (0, bcrypt_1.comparePassword)(password, user.password);
    if (!isValid) {
        if (_redis) {
            await _redis.incr(rateLimitKey);
            if (remaining <= 1) {
                await _redis.setex(lockoutKey, 1800, '1'); // Lock for 30 min
                (0, email_service_1.sendAccountLockedEmail)(user.email, user.name || 'User').catch(console.error);
            }
        }
        throw new errors_1.ApiError(401, 'Invalid credentials');
    }
    // 6. Clear failed attempts
    if (_redis) {
        await _redis.del(rateLimitKey);
    }
    // 7. Generate tokens
    const tokens = (0, jwt_1.generateTokenPair)({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
    });
    // 8. Store refresh token & update user stats
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        await token_model_1.RefreshTokenModel.create([{
                token: tokens.refreshToken,
                user: user._id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                ipAddress: ip,
                userAgent
            }], { session });
        // Update user login stats
        user.lastLoginAt = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save({ session });
        // Audit Log
        await audit_model_1.AuditLogModel.create([{
                userId: user._id,
                action: 'LOGIN',
                entity: 'USER',
                entityId: user._id.toString(),
                ipAddress: ip,
                userAgent
            }], { session });
        await session.commitTransaction();
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
    return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image
        }
    };
};
exports.loginUser = loginUser;
const refreshTokenService = async (token) => {
    let payload;
    try {
        payload = (0, jwt_1.verifyRefreshToken)(token);
    }
    catch (error) {
        throw new errors_1.UnauthorizedError('Invalid refresh token');
    }
    // Find token and populate user
    const storedToken = await token_model_1.RefreshTokenModel.findOne({ token }).populate('user');
    if (!storedToken) {
        throw new errors_1.UnauthorizedError('Refresh token not found');
    }
    if (storedToken.expiresAt < new Date()) {
        await token_model_1.RefreshTokenModel.deleteOne({ token });
        throw new errors_1.UnauthorizedError('Refresh token expired');
    }
    if (!storedToken.user) {
        throw new errors_1.UnauthorizedError('User not found');
    }
    const user = storedToken.user;
    // Generate new
    const newTokens = (0, jwt_1.generateTokenPair)({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
    });
    // Rotate token
    // Delete old
    await token_model_1.RefreshTokenModel.deleteOne({ token });
    // Create new
    await token_model_1.RefreshTokenModel.create({
        token: newTokens.refreshToken,
        user: user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: storedToken.ipAddress,
        userAgent: storedToken.userAgent
    });
    return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken
    };
};
exports.refreshTokenService = refreshTokenService;
const requestPasswordReset = async (email, ip) => {
    const emailRateLimitKey = `forgot_password:email:${email}`;
    const { allowed: emailAllowed } = await (0, redis_1.checkRateLimit)(emailRateLimitKey, 3, 3600);
    if (!emailAllowed)
        return true;
    const ipRateLimitKey = `forgot_password:ip:${ip}`;
    const { allowed: ipAllowed } = await (0, redis_1.checkRateLimit)(ipRateLimitKey, 10, 3600);
    if (!ipAllowed) {
        throw new errors_1.ApiError(429, 'Too many requests. Try again later.');
    }
    const user = await user_model_1.default.findOne({ email });
    if (!user)
        return true;
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    const tokenHash = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    // Delete old
    await token_model_1.PasswordResetTokenModel.deleteMany({ user: user._id });
    // Create new
    await token_model_1.PasswordResetTokenModel.create({
        user: user._id,
        tokenHash,
        expiresAt
    });
    await (0, email_service_1.sendPasswordResetEmail)(user.email, user.name || 'User', resetToken);
    await audit_model_1.AuditLogModel.create({
        userId: user._id,
        action: 'PASSWORD_RESET_REQUESTED',
        entity: 'USER',
        entityId: user._id.toString(),
        ipAddress: ip
    });
    return true;
};
exports.requestPasswordReset = requestPasswordReset;
const logoutUser = async (userId, refreshToken) => {
    if (refreshToken) {
        await token_model_1.RefreshTokenModel.deleteMany({
            user: userId,
            token: refreshToken
        });
    }
    await audit_model_1.AuditLogModel.create({
        userId,
        action: 'LOGOUT',
        entity: 'USER',
        entityId: userId
    });
    return true;
};
exports.logoutUser = logoutUser;
const logoutAllDevices = async (userId) => {
    await token_model_1.RefreshTokenModel.deleteMany({ user: userId });
    await audit_model_1.AuditLogModel.create({
        userId,
        action: 'LOGOUT_ALL',
        entity: 'USER',
        entityId: userId
    });
    return true;
};
exports.logoutAllDevices = logoutAllDevices;
const resetPassword = async (token, password) => {
    const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
    const storedToken = await token_model_1.PasswordResetTokenModel.findOne({ tokenHash }).populate('user');
    if (!storedToken) {
        throw new errors_1.ApiError(400, 'Invalid or expired password reset token');
    }
    if (storedToken.expiresAt < new Date()) {
        await token_model_1.PasswordResetTokenModel.deleteOne({ tokenHash });
        throw new errors_1.ApiError(400, 'Password reset token has expired');
    }
    if (!storedToken.user) {
        throw new errors_1.ApiError(404, 'User not found');
    }
    const user = storedToken.user;
    const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        user.password = hashedPassword;
        await user.save({ session });
        await token_model_1.PasswordResetTokenModel.deleteOne({ tokenHash }, { session });
        await audit_model_1.AuditLogModel.create([{
                userId: user._id,
                action: 'PASSWORD_RESET_SUCCESSFUL',
                entity: 'USER',
                entityId: user._id.toString()
            }], { session });
        await session.commitTransaction();
    }
    catch (err) {
        await session.abortTransaction();
        throw err;
    }
    finally {
        session.endSession();
    }
    return true;
};
exports.resetPassword = resetPassword;
