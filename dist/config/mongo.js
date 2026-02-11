"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../middleware/logger");
const env_config_1 = require("./env.config");
const connectDB = async () => {
    try {
        const mongoURI = env_config_1.config.mongodbUri;
        if (!mongoURI) {
            throw new Error('MONGODB_URI environment variable is not defined');
        }
        const conn = await mongoose_1.default.connect(mongoURI);
        logger_1.logger.info(`🚀 MongoDB Connected: ${conn.connection.host}`);
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            logger_1.logger.error('MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.logger.warn('MongoDB disconnected');
        });
    }
    catch (error) {
        logger_1.logger.error('Error connecting to MongoDB:', error);
        // In serverless/Vercel, we shouldn't exit the process as it might be reused.
        // Instead throw the error to be handled by the caller.
        throw error;
    }
};
exports.default = connectDB;
