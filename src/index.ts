import app from './app';
import connectDB from './config/mongo';
import mongoose from 'mongoose';
import { startupErrors } from './config/env.config';

export default async function (req: any, res: any) {
  // Check for configuration errors first
  if (startupErrors.length > 0) {
    console.error('Startup failed due to configuration errors:', startupErrors);
    return res.status(500).json({
      error: 'Server Configuration Error',
      message: 'Missing required environment variables',
      details: startupErrors
    });
  }

  // Ensure database is connected
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (error) {
      console.error('Database connection failed:', error);
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }

  // Delegate to Express app
  app(req, res);
}
