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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordController = exports.googleCallback = exports.forgotPassword = exports.revokeSession = exports.getActiveSessions = exports.logoutAll = exports.logout = exports.refreshAccessToken = exports.login = exports.resendVerification = exports.verifyEmail = exports.register = void 0;
const auth_service_1 = require("@/services/auth.service");
const errors_1 = require("@/utils/errors");
const token_model_1 = require("@/models/token.model");
const userAgent_1 = require("@/utils/userAgent");
const jwt_1 = require("@/utils/jwt");
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const result = await (0, auth_service_1.registerUser)({ name, email, password });
        res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email to verify your account.',
            data: result
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;
        await (0, auth_service_1.verifyUserEmail)(token);
        res.json({
            success: true,
            message: 'Email verified successfully. You can now login.'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyEmail = verifyEmail;
const resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        await (0, auth_service_1.resendVerificationEmail)(email);
        res.json({
            success: true,
            message: 'Verification email sent'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resendVerification = resendVerification;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ip = req.ip || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const result = await (0, auth_service_1.loginUser)({ email, password, ip, userAgent });
        // Set refresh token in cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: result.user,
                accessToken: result.accessToken
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refreshAccessToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new errors_1.UnauthorizedError('Refresh token not found');
        }
        const result = await (0, auth_service_1.refreshTokenService)(refreshToken);
        // Set new refresh token in cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({
            success: true,
            data: {
                accessToken: result.accessToken
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.refreshAccessToken = refreshAccessToken;
const logout = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        const userId = req.user.userId;
        await (0, auth_service_1.logoutUser)(userId, refreshToken);
        // Clear cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const logoutAll = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        await (0, auth_service_1.logoutAllDevices)(userId);
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.json({
            success: true,
            message: 'Logged out from all devices'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.logoutAll = logoutAll;
const getActiveSessions = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const sessions = await token_model_1.RefreshTokenModel.find({
            user: userId,
            expiresAt: { $gt: new Date() }
        })
            .select('_id ipAddress userAgent createdAt expiresAt token')
            .sort({ createdAt: -1 })
            .lean();
        // Parse user agents for better display
        const formattedSessions = sessions.map((session) => ({
            id: session._id.toString(),
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            device: (0, userAgent_1.parseUserAgent)(session.userAgent),
            isCurrent: req.cookies.refreshToken === session.token
        }));
        res.json({
            success: true,
            data: formattedSessions
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getActiveSessions = getActiveSessions;
const revokeSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.userId;
        await token_model_1.RefreshTokenModel.deleteMany({
            _id: sessionId,
            user: userId // Ensure user can only revoke own sessions
        });
        res.json({
            success: true,
            message: 'Session revoked'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.revokeSession = revokeSession;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const ip = req.ip || 'unknown';
        await (0, auth_service_1.requestPasswordReset)(email, ip);
        // Always return success to prevent email enumeration
        res.json({
            success: true,
            message: 'If an account exists, a password reset email has been sent'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
const googleCallback = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
        }
        // Generate tokens
        const tokens = (0, jwt_1.generateTokenPair)({
            userId: user.id,
            email: user.email,
            role: user.role
        });
        // Store refresh token
        await token_model_1.RefreshTokenModel.create({
            token: tokens.refreshToken,
            user: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown'
        });
        // User update is handled in passport strategy now
        // Audit log
        const { AuditLogModel } = await Promise.resolve().then(() => __importStar(require('@/models/audit.model')));
        await AuditLogModel.create({
            userId: user.id,
            action: 'OAUTH_LOGIN',
            entity: 'USER',
            entityId: user.id,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown'
        });
        // Set refresh token in cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        // Redirect to frontend with access token
        const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?accessToken=${tokens.accessToken}`;
        res.redirect(redirectUrl);
    }
    catch (error) {
        next(error);
    }
};
exports.googleCallback = googleCallback;
const resetPasswordController = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        await (0, auth_service_1.resetPassword)(token, password);
        res.json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPasswordController = resetPasswordController;
