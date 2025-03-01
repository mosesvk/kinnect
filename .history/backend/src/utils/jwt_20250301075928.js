// utils/jwt.js
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },  // Using 'id' instead of '_id'
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

module.exports = { generateToken };