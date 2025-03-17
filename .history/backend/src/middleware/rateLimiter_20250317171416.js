// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

/**
 * Basic rate limiter for all API endpoints
 * Limits requests to 100 per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

/**
 * Strict rate limiter for auth endpoints
 * Limits requests to 10 per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

/**
 * Moderate rate limiter for media endpoints
 * Limits requests to 50 per 15 minutes
 */
const mediaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many media upload requests, please try again later.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  mediaLimiter
};