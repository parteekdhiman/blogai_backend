"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const app_1 = __importDefault(require("./app"));
const mongo_1 = __importDefault(require("./config/mongo"));
const mongoose_1 = __importDefault(require("mongoose"));
const env_config_1 = require("./config/env.config");
async function default_1(req, res) {
    // Check for configuration errors first
    if (env_config_1.startupErrors.length > 0) {
        console.error('Startup failed due to configuration errors:', env_config_1.startupErrors);
        return res.status(500).json({
            error: 'Server Configuration Error',
            message: 'Missing required environment variables',
            details: env_config_1.startupErrors
        });
    }
    // Ensure database is connected
    if (mongoose_1.default.connection.readyState !== 1) {
        try {
            await (0, mongo_1.default)();
        }
        catch (error) {
            console.error('Database connection failed:', error);
            return res.status(500).json({ error: 'Database connection failed' });
        }
    }
    // Delegate to Express app
    (0, app_1.default)(req, res);
}
