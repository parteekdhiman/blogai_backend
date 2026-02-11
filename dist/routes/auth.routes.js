"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validation_1 = require("@/middleware/validation");
const validators_1 = require("@/utils/validators");
const auth_controller_1 = require("@/controllers/auth.controller");
const auth_1 = require("@/middleware/auth");
const passport_1 = __importDefault(require("@/config/passport"));
const router = express_1.default.Router();
// Public routes
router.post('/register', (0, validation_1.validate)(validators_1.registerSchema), auth_controller_1.register);
router.post('/login', (0, validation_1.validate)(validators_1.loginSchema), auth_controller_1.login);
router.post('/forgot-password', (0, validation_1.validate)(validators_1.forgotPasswordSchema), auth_controller_1.forgotPassword);
router.post('/reset-password', (0, validation_1.validate)(validators_1.resetPasswordSchema), auth_controller_1.resetPasswordController);
router.post('/refresh', auth_controller_1.refreshAccessToken);
router.post('/verify-email', (0, validation_1.validate)(validators_1.verifyEmailSchema), auth_controller_1.verifyEmail);
router.post('/resend-verification', (0, validation_1.validate)(validators_1.resendVerificationSchema), auth_controller_1.resendVerification);
// Google OAuth routes
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
}));
router.get('/google/callback', passport_1.default.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`
}), auth_controller_1.googleCallback);
// Protected routes
router.post('/logout', auth_1.protect, auth_controller_1.logout);
router.post('/logout-all', auth_1.protect, auth_controller_1.logoutAll);
router.get('/sessions', auth_1.protect, auth_controller_1.getActiveSessions);
router.delete('/sessions/:sessionId', auth_1.protect, auth_controller_1.revokeSession);
exports.default = router;
