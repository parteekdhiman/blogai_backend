import mongoose from 'mongoose';
import { logger } from '@middleware/logger';
import { config } from './env.config';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = config.mongodbUri;

    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    const conn = await mongoose.connect(mongoURI);

    logger.info(`🚀 MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    // In serverless/Vercel, we shouldn't exit the process as it might be reused.
    // Instead throw the error to be handled by the caller.
    throw error;
  }
};

export default connectDB;
