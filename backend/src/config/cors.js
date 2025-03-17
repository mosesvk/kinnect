// src/config/cors.js
/**
 * CORS configuration for the application
 * This file configures Cross-Origin Resource Sharing settings
 */

// Create different CORS settings based on environment
const corsOptions = {
    // Development environment: allow all origins for easy local development
    development: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400, // 24 hours
    },
    
    // Test environment: allow all origins for testing
    test: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
    },
    
    // Production environment: restrict to specific origins
    production: {
      origin: function (origin, callback) {
        // Get allowed origins from environment variable
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400, // 24 hours
    }
  };
  
  // Export the appropriate configuration based on environment
  module.exports = corsOptions[process.env.NODE_ENV || 'development'];