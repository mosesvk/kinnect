// tests/helpers/auth-test-helper.js
const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for testing
 * @param {string} userId - User ID to include in token
 * @returns {string} JWT token
 */
const generateTestToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
    );
};

/**
 * Create authorization headers with a JWT token
 * @param {string} userId - User ID to include in token
 * @returns {Object} Headers object with Authorization
 */
const createAuthHeaders = (userId) => {
    const token = generateTestToken(userId);
    return { Authorization: `Bearer ${token}` };
};

module.exports = {
    generateTestToken,
    createAuthHeaders
};