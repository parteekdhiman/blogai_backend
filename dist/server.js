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
require("./instrument"); // Must be first
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before any other imports
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const logger_1 = require("@middleware/logger");
const mongo_1 = __importDefault(require("@config/mongo"));
const redis_1 = __importDefault(require("@config/redis"));
const env_validator_1 = require("@utils/env.validator");
// Load environment variables and validate
(0, env_validator_1.validateEnv)();
const PORT = process.env.PORT || 5000;
process.title = 'blog-ai-backend';
const server = http_1.default.createServer(app_1.default);
// Redis connection - already handled events in config/redis.ts
// We just verify it's working here
const verifyRedis = async () => {
    try {
        const _redis = redis_1.default;
        if (_redis) {
            await _redis.ping();
            logger_1.logger.info('🚀 Redis connected successfully');
        }
        else {
            logger_1.logger.warn('⚠️ Redis not configured');
        }
    }
    catch (err) {
        logger_1.logger.warn('⚠️ Redis connection failed (Optional). Some features might be limited.');
    }
};
/**
 * SERVER STARTUP
 */
const startServer = async () => {
    // Connect to Database
    await (0, mongo_1.default)();
    await verifyRedis();
    server.listen(PORT, () => {
        logger_1.logger.info('=============================================');
        logger_1.logger.info(`🚀 BLOG-AI API is running!`);
        logger_1.logger.info(`📡 Port: ${PORT}`);
        logger_1.logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
        logger_1.logger.info(`🆔 Process ID: ${process.pid}`);
        logger_1.logger.info(`🕒 Start Time: ${new Date().toISOString()}`);
        logger_1.logger.info('=============================================');
        if (process.env.NODE_ENV === 'development') {
            const routes = app_1.default._router.stack
                .filter((r) => r.route)
                .map((r) => `${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
            logger_1.logger.debug('Available Routes:', routes);
        }
    });
};
/**
 * GRACEFUL SHUTDOWN
 */
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        logger_1.logger.info('HTTP server closed.');
        try {
            // Mongoose disconnects automatically typically, but good to be explicit
            const mongoose = await Promise.resolve().then(() => __importStar(require('mongoose')));
            await mongoose.disconnect();
            logger_1.logger.info('MongoDB connection closed.');
            const _redis = redis_1.default;
            if (_redis) {
                await _redis.quit();
                logger_1.logger.info('Redis connection closed.');
            }
            logger_1.logger.info('Graceful shutdown completed.');
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.error('Error during graceful shutdown:', err);
            process.exit(1);
        }
    });
    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        logger_1.logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};
// Process Event Listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Promise Rejection:', reason);
    // In production, we might want to shutdown
    if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('unhandledRejection');
    }
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
startServer();
