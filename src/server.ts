import './instrument'; // Must be first
import dotenv from 'dotenv';

// Load environment variables before any other imports
dotenv.config();

import http from 'http';
import app from './app';
import { logger } from '@middleware/logger';
import connectDB from '@config/mongo';
import redis from '@config/redis';
import { validateEnv } from '@utils/env.validator';

// Load environment variables and validate
validateEnv();

const PORT = process.env.PORT || 5000;
process.title = 'blog-ai-backend';

const server = http.createServer(app);

// Redis connection - already handled events in config/redis.ts
// We just verify it's working here
const verifyRedis = async () => {
    try {
        const _redis = redis;
        if (_redis) {
            await _redis.ping();
            logger.info('🚀 Redis connected successfully');
        } else {
             logger.warn('⚠️ Redis not configured');
        }
    } catch (err) {
        logger.warn('⚠️ Redis connection failed (Optional). Some features might be limited.');
    }
};

/**
 * SERVER STARTUP
 */
const startServer = async () => {
  // Connect to Database
  await connectDB();
  await verifyRedis();

  server.listen(PORT, () => {
    logger.info('=============================================');
    logger.info(`🚀 BLOG-AI API is running!`);
    logger.info(`📡 Port: ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🆔 Process ID: ${process.pid}`);
    logger.info(`🕒 Start Time: ${new Date().toISOString()}`);
    logger.info('=============================================');
    
    if (process.env.NODE_ENV === 'development') {
        const routes = app._router.stack
            .filter((r: any) => r.route)
            .map((r: any) => `${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
        logger.debug('Available Routes:', routes);
    }
  });
};

/**
 * GRACEFUL SHUTDOWN
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      // Mongoose disconnects automatically typically, but good to be explicit
      const mongoose = await import('mongoose');
      await mongoose.disconnect();
      logger.info('MongoDB connection closed.');
      
      const _redis = redis;
      if (_redis) {
          await _redis.quit();
          logger.info('Redis connection closed.');
      }
      
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Process Event Listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', reason);
  // In production, we might want to shutdown
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('unhandledRejection');
  }
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
