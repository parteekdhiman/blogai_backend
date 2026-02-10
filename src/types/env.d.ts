declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // App
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      API_VERSION: string;

      // Database
      MONGODB_URI: string;

      // Redis (Optional)
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      REDIS_TLS?: string;

      // JWT
      JWT_SECRET: string;
      JWT_REFRESH_SECRET: string;
      JWT_ACCESS_EXPIRY: string;
      JWT_REFRESH_EXPIRY: string;

      // Email (Optional)
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USER?: string;
      SMTP_PASS?: string;
      SMTP_SECURE?: string;
      EMAIL_FROM?: string;

      // Cloudinary (Optional)
      CLOUDINARY_CLOUD_NAME?: string;
      CLOUDINARY_API_KEY?: string;
      CLOUDINARY_API_SECRET?: string;

      // OpenAI (Optional)
      OPENAI_API_KEY?: string;

      // URLs
      APP_URL: string;
      CLIENT_URL: string;
      BACKEND_URL: string;
      CORS_ORIGIN: string;
      API_URL?: string;

      // Google OAuth (Optional)
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
    }
  }
}

export {};
