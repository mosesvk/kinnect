const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },  // Changed from { userId } to { id: userId }
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

module.exports = { generateToken };