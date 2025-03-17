// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes middleware
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, no token'
        });
      }

      // Verify token
      const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret-key' : undefined);
      
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
      }
      
      const decoded = jwt.verify(token, secret);

      // Get user from the token
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] }
      });

      if (!req.user) {
        throw new Error('User not found');
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Admin middleware
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as an admin'
    });
  }
};