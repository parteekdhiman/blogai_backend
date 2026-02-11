"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokenPair = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("@/utils/errors");
const generateAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '15m') });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') });
};
exports.generateRefreshToken = generateRefreshToken;
const generateTokenPair = (payload) => {
    return {
        accessToken: (0, exports.generateAccessToken)(payload),
        refreshToken: (0, exports.generateRefreshToken)(payload)
    };
};
exports.generateTokenPair = generateTokenPair;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_1.ApiError(401, 'Access token expired');
        }
        throw new errors_1.ApiError(401, 'Invalid access token');
    }
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new errors_1.ApiError(401, 'Refresh token expired');
        }
        throw new errors_1.ApiError(401, 'Invalid refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
