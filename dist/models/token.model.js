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
exports.PasswordResetTokenModel = exports.VerificationTokenModel = exports.RefreshTokenModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RefreshTokenSchema = new mongoose_1.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    ipAddress: String,
    userAgent: String
}, { timestamps: true });
// TTL Index: Automatically delete document when expiresAt is reached
// NOTE: MongoDB runs the cleanup thread every 60s.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
exports.RefreshTokenModel = mongoose_1.default.model('RefreshToken', RefreshTokenSchema);
const VerificationTokenSchema = new mongoose_1.Schema({
    identifier: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expires: {
        type: Date,
        required: true
    }
});
VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });
VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });
exports.VerificationTokenModel = mongoose_1.default.model('VerificationToken', VerificationTokenSchema);
const PasswordResetTokenSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
});
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
exports.PasswordResetTokenModel = mongoose_1.default.model('PasswordResetToken', PasswordResetTokenSchema);
