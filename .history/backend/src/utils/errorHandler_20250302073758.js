// src/utils/errorHandler.js
const errorHandler = (error, req, res) => {
    console.error('Error:', error);
    
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors: messages
      });
    }
    
    // Sequelize validation error
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        errors: messages
      });
    }
    
    // Duplicate key error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value entered'
      });
    }
    
    // JWT Error
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // JWT Expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    // Default server error
    return res.status(500).json({
      success: false,
      message: error.message || 'Server Error'
    });
  };
  
  module.exports = errorHandler;