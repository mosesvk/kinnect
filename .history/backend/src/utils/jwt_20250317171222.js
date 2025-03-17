// src/utils/jwt.js
const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user authentication
 * @param {string} userId - User ID to include in token payload
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
    // Get secret from environment variables with fallback for test environments
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret-key' : undefined);
    
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    
    return jwt.sign(
        { id: userId },
        secret,
        { expiresIn: '24h' }
    );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
    try {
        const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret-key' : undefined);
        
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not set');
        }
        
        return jwt.verify(token, secret);
    } catch (error) {
        console.error('Token verification error:', error.message);
        return null;
    }
};

module.exports = { generateToken, verifyToken };