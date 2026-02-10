import { v2 as cloudinary } from 'cloudinary';
import { config } from './env.config';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName || undefined,
  api_key: config.cloudinary.apiKey || undefined,
  api_secret: config.cloudinary.apiSecret || undefined,
});

export default cloudinary;
