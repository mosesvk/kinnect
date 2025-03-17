// src/utils/jwt.js
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    // Ensure we have a JWT_SECRET, if not (should never happen but for safety) use a default one in development only
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-secret-key' : undefined);
    
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    
    return jwt.sign(
        { id: userId },
        secret,
        { expiresIn: '24h' }
    );
};

module.exports = { generateToken };