// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] }
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found with this token'
        });
      }
      
      req.user = user;
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};