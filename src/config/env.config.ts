import { logger } from '@middleware/logger';

/**
 * Centralized Environment Configuration
 * Provides type-safe access to all environment variables
 */

export interface AppConfig {
  // App
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  apiVersion: string;

  // Database
  mongodbUri: string;

  // Redis (Optional)
  redis: {
    host: string | null;
    port: number | null;
    password: string | null;
    tls: boolean;
  };

  // JWT
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };

  // Email (Optional)
  email: {
    host: string | null;
    port: number | null;
    user: string | null;
    pass: string | null;
    secure: boolean;
    from: string;
  };

  // Cloudinary (Optional)
  cloudinary: {
    cloudName: string | null;
    apiKey: string | null;
    apiSecret: string | null;
  };

  // OpenAI (Optional)
  openai: {
    apiKey: string | null;
  };

  // URLs
  urls: {
    app: string;
    client: string;
    backend: string;
    cors: string[];
    api: string;
  };

  // Google OAuth (Optional)
  google: {
    clientId: string | null;
    clientSecret: string | null;
  };

  // Unsplash (Optional)
  unsplash: {
    accessKey: string | null;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// Stores any errors encountered during configuration loading
export const startupErrors: string[] = [];

/**
 * Load and validate environment configuration
 */
function loadConfig(): AppConfig {
  // Required environment variables
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CORS_ORIGIN',
  ];

  const missing = requiredVars.filter((key) => !process.env[key]);



if (missing.length > 0) {
  const errorMsg = `❌ Missing required environment variables: ${missing.join(', ')}`;
  logger.error(errorMsg);
  startupErrors.push(errorMsg);
}

// Ensure required variables have at least a placeholder to avoid runtime crashes before error reporting
const getEnv = (key: string, defaultValue: string = ''): string => {
  const value = process.env[key];
  if (!value && requiredVars.includes(key)) {
    // Already logged above, but return empty string to satisfy types
    return defaultValue;
  }
  return value || defaultValue;
};

  // Parse CORS origins
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['*'];

  const config: AppConfig = {
    // App
    nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test',
    port: parseInt(process.env.PORT || '5000', 10),
    apiVersion: process.env.API_VERSION || 'v1',

    // Database
    mongodbUri: getEnv('MONGODB_URI'),

    // Redis
    redis: {
      host: process.env.REDIS_HOST || null,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : null,
      password: process.env.REDIS_PASSWORD || null,
      tls: process.env.REDIS_TLS === 'true',
    },

    // JWT
    jwt: {
      secret: getEnv('JWT_SECRET', 'default_secret_to_prevent_crash'),
      refreshSecret: getEnv('JWT_REFRESH_SECRET', 'default_secret_to_prevent_crash'),
      accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    },

    // Email
    email: {
      host: process.env.SMTP_HOST || null,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null,
      user: process.env.SMTP_USER || null,
      pass: process.env.SMTP_PASS || null,
      secure: process.env.SMTP_SECURE === 'true',
      from: process.env.EMAIL_FROM || 'noreply@example.com',
    },

    // Cloudinary
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
      apiKey: process.env.CLOUDINARY_API_KEY || null,
      apiSecret: process.env.CLOUDINARY_API_SECRET || null,
    },

    // OpenAI
    openai: {
      apiKey: process.env.OPENAI_API_KEY || null,
    },

    // URLs
    urls: {
      app: process.env.APP_URL || 'http://localhost:3000',
      client: process.env.CLIENT_URL || 'http://localhost:3000',
      backend: process.env.BACKEND_URL || 'http://localhost:5000',
      cors: corsOrigins,
      api: process.env.API_URL || 'http://localhost:5000',
    },

    // Google OAuth
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || null,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
    },

    // Unsplash
    unsplash: {
      accessKey: process.env.UNSPLASH_ACCESS_KEY || null,
    },

    // Rate Limiting
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
  };

  // Log configuration in development
  if (config.nodeEnv === 'development') {
    logger.info('🔧 Environment configuration loaded successfully');
    logger.debug('App Configuration:', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      apiVersion: config.apiVersion,
      mongodbUri: config.mongodbUri.replace(/:([^@]+)@/, ':****@'),
      redisConfigured: !!config.redis.host,
      emailConfigured: !!config.email.host,
      cloudinaryConfigured: !!config.cloudinary.cloudName,
      openaiConfigured: !!config.openai.apiKey,
      googleOAuthConfigured: !!config.google.clientId,
      unsplashConfigured: !!config.unsplash.accessKey,
    });
  }

  // Warn about optional services
  if (!config.redis.host) {
    logger.warn('⚠️  Redis not configured - caching will be disabled');
  }

  if (!config.email.host) {
    logger.warn('⚠️  Email not configured - email sending will be disabled');
  }

  if (!config.cloudinary.cloudName) {
    logger.warn('⚠️  Cloudinary not configured - file uploads may fail');
  }

  if (!config.openai.apiKey) {
    logger.warn('⚠️  OpenAI not configured - OPENAI_API_KEY missing. AI generation will return mock content.');
  }

  if (!config.google.clientId || !config.google.clientSecret) {
    logger.warn('⚠️  Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET missing');
  }

  return config;
}

// Export singleton instance
export const config = loadConfig();

// Export validation function for backward compatibility
export const validateEnv = () => {
  // Config is already validated in loadConfig
  return config;
};
