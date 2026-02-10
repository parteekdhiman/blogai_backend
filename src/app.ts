import 'express-async-errors';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Middlewares
import { errorHandler } from '@middleware/errorHandler';
import { logger } from '@middleware/logger';

// Config
// import prisma from '@config/database'; // Deprecated
import redis from '@config/redis';

// Utils
import { NotFoundError } from '@utils/errors';

// Routes
import authRoutes from '@routes/auth.routes';
import blogRoutes from '@routes/blog.routes';
import userRoutes from '@routes/user.routes';
import categoryRoutes from '@routes/category.routes';
import aiRoutes from '@routes/ai.routes';
import uploadRoutes from '@routes/upload.routes';
import analyticsRoutes from '@routes/analytics.routes';
import passport from '@/config/passport';

// Load environment variables
// dotenv.config(); // Moved to server.ts

/**
 * Express Application Configuration
 * This file sets up the main Express application, including middlewares,
 * security headers, logging, and route mounting.
 */

const app: Express = express();

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
app.use(helmet({
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
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

/**
 * 3. REQUEST PARSING & TIMEOUT
 */
// Limit request body size for security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// Set global request timeout (30 seconds)
app.use((req: Request, res: Response, next: NextFunction) => {
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
app.use((req: Request, res: Response, next: NextFunction) => {
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
app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Logging with correlation ID
morgan.token('id', (req: Request) => req.id);
app.use(morgan(':id :method :url :status :response-time ms - :res[content-length]', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
}));

/**
 * 5. RATE LIMITING
 */
const globalLimiter = rateLimit({
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
app.get('/health', async (req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    try {
        // Check Mongoose connection
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        const mongooseState = (await import('mongoose')).default.connection.readyState;
        if (mongooseState === 1) {
            dbStatus = 'connected';
        } else {
             dbStatus = `disconnected (state: ${mongooseState})`;
        }
    } catch (err) {
        dbStatus = 'disconnected';
    }

    try {
        const _redis = redis;
        if (_redis) {
            await _redis.ping();
            redisStatus = 'connected';
        } else {
            redisStatus = 'not configured';
        }
    } catch (err) {
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
app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: '🤖 AI Blog Generator API is running!',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        health_check: '/health'
    });
});

// API Routes Mounting
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/blogs`, blogRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);

/**
 * 7. ERROR HANDLING
 */
// Catch unknown routes and pass to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.originalUrl} not found`));
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
app.use(errorHandler);

export default app;
