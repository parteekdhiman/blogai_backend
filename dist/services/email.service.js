"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = exports.sendAccountLockedEmail = exports.sendVerificationEmail = exports.sendPasswordResetEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = require("../middleware/logger");
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// Verify connection configuration
transporter.verify((error, success) => {
    if (error) {
        logger_1.logger.error('❌ Email transporter error:', error);
    }
    else {
        logger_1.logger.info('📧 Email transporter is ready');
    }
});
const sendPasswordResetEmail = async (email, name, token) => {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    logger_1.logger.info(`📧 Sending password reset email to ${email}`);
    if (process.env.NODE_ENV === 'development') {
        logger_1.logger.debug(`Reset URL: ${resetUrl}`);
    }
    await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject: 'Reset Your Password',
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #000; 
              color: #fff; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy this link: <br><code>${resetUrl}</code></p>
            <p class="footer">
              This link will expire in 1 hour.<br>
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    logger_1.logger.info(`📧 Sending verification email to ${email}`);
    if (process.env.NODE_ENV === 'development') {
        logger_1.logger.debug(`Verification URL: ${verifyUrl}`);
    }
    await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject: 'Verify Your Email',
        html: `
      <!DOCTYPE html>
      <html>
        <body>
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to BlogAI Platform!</h2>
            <p>Please verify your email address:</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
              Verify Email
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This link expires in 24 hours.
            </p>
          </div>
        </body>
      </html>
    `
    });
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendAccountLockedEmail = async (email, name) => {
    logger_1.logger.warn(`🚨 Sending account locked notification to ${email}`);
    await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject: 'Account Security Alert',
        html: `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2>Security Alert</h2>
        <p>Hi ${name},</p>
        <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
        <p>The lock will be automatically removed in 30 minutes.</p>
        <p>If this wasn't you, please reset your password immediately.</p>
      </div>
    `
    });
};
exports.sendAccountLockedEmail = sendAccountLockedEmail;
const sendWelcomeEmail = async (email, name) => {
    logger_1.logger.info(`📧 Sending welcome email to ${email}`);
    await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: email,
        subject: 'Welcome to BlogAI Platform',
        html: `
      <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${name}!</h2>
        <p>Your email has been verified successfully.</p>
        <p>You can now start creating amazing blogs with AI assistance.</p>
        <a href="${process.env.CLIENT_URL}/login" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
          Get Started
        </a>
      </div>
    `
    });
};
exports.sendWelcomeEmail = sendWelcomeEmail;
