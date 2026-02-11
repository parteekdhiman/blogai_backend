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
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const uuid_1 = require("uuid");
// Middlewares
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./middleware/logger");
// Config
// import prisma from '@config/database'; // Deprecated
const redis_1 = __importDefault(require("./config/redis"));
// Utils
const errors_1 = require("./utils/errors");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const blog_routes_1 = __importDefault(require("./routes/blog.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const passport_1 = __importDefault(require("./config/passport"));
// Load environment variables
// dotenv.config(); // Moved to server.ts
/**
 * Express Application Configuration
 * This file sets up the main Express application, including middlewares,
 * security headers, logging, and route mounting.
 */
const app = (0, express_1.default)();
/**
 * 1. BASIC SETTINGS
 */
// Disable X-Powered-By header to hide server technology
app.disable('x-powered-By');
// Trust proxy if behind a reverse proxy (Nginx, Heroku, etc.)
// Especially important for correct IP rate limiting
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
/**
 * 2. SECURITY MIDDLEWARES
 */
// Helmet for comprehensive security headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.cloudinary.com", "https://api.openai.com"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
}));
// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['*'];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Allow requests from configured origins
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            // Reject in a browser-friendly way without throwing an error
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200,
    maxAge: 86400, // 24 hours
}));
/**
 * 3. REQUEST PARSING & TIMEOUT
 */
// Limit request body size for security
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
app.use(passport_1.default.initialize());
// Set global request timeout (30 seconds)
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: {
                    message: 'Request timeout',
                    code: 'REQUEST_TIMEOUT',
                },
            });
        }
    });
    next();
});
// Validate Content-Type for state-changing requests
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('json') && !req.is('multipart/form-data')) {
        return res.status(415).json({
            success: false,
            error: {
                message: 'Unsupported Content-Type. Please use application/json or multipart/form-data.',
                code: 'UNSUPPORTED_MEDIA_TYPE',
            },
        });
    }
    next();
});
/**
 * 4. REQUEST TRACKING & LOGGING
 */
// Generate UUID for each request for correlation
app.use((req, res, next) => {
    req.id = (0, uuid_1.v4)();
    res.setHeader('X-Request-ID', req.id);
    next();
});
// Logging with correlation ID
morgan_1.default.token('id', (req) => req.id);
app.use((0, morgan_1.default)(':id :method :url :status :response-time ms - :res[content-length]', {
    stream: {
        write: (message) => logger_1.logger.info(message.trim()),
    },
}));
/**
 * 5. RATE LIMITING
 */
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins default
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests default
    message: {
        success: false,
        error: {
            message: 'Too many requests, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for static assets if they were to be served via Express
    skip: (req) => req.url.includes('/static/') || req.url.includes('/assets/'),
});
app.use('/api/', globalLimiter);
/**
 * 6. ROUTES
 */
// Health check endpoint
// Health check endpoint
app.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';
    try {
        // Check Mongoose connection
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        const mongooseState = (await Promise.resolve().then(() => __importStar(require('mongoose')))).default.connection.readyState;
        if (mongooseState === 1) {
            dbStatus = 'connected';
        }
        else {
            dbStatus = `disconnected (state: ${mongooseState})`;
        }
    }
    catch (err) {
        dbStatus = 'disconnected';
    }
    try {
        const _redis = redis_1.default;
        if (_redis) {
            await _redis.ping();
            redisStatus = 'connected';
        }
        else {
            redisStatus = 'not configured';
        }
    }
    catch (err) {
        redisStatus = 'disconnected';
    }
    const isHealthy = dbStatus === 'connected';
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV,
        database: dbStatus,
        redis: redisStatus,
        version: process.env.API_VERSION || 'v1',
    });
});
// Root route for Vercel/Production check
app.get('/', (req, res) => {
    res.status(200).json({
        message: '🤖 AI Blog Generator API is running!',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        health_check: '/health'
    });
});
// API Routes Mounting
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, auth_routes_1.default);
app.use(`${API_PREFIX}/blogs`, blog_routes_1.default);
app.use(`${API_PREFIX}/users`, user_routes_1.default);
app.use(`${API_PREFIX}/categories`, category_routes_1.default);
app.use(`${API_PREFIX}/ai`, ai_routes_1.default);
app.use(`${API_PREFIX}/upload`, upload_routes_1.default);
app.use(`${API_PREFIX}/analytics`, analytics_routes_1.default);
/**
 * 7. ERROR HANDLING
 */
// Catch unknown routes and pass to error handler
app.use((req, res, next) => {
    next(new errors_1.NotFoundError(`Route ${req.originalUrl} not found`));
});
// Sentry Debug Route
app.get("/debug-sentry", function mainHandler(req, res) {
    const Sentry = require("@sentry/node");
    Sentry.logger.info('User triggered test error', {
        action: 'test_error_endpoint',
    });
    Sentry.metrics.count('test_counter', 1);
    throw new Error("My first Sentry error!");
});
// The error handler must be registered before any other error middleware and after all controllers
const Sentry = require("@sentry/node");
Sentry.setupExpressErrorHandler(app);
// Global central error handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
