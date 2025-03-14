
// Handle 404 errors (Resource not found)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
  };
  
  // Handle all other errors
  const errorHandler = (err, req, res, next) => {
    // Set status code (use existing status code or default to 500)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    // Create response object
    const errorResponse = {
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    };
  
    // Handle specific error types for better client responses
    
    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    // Sequelize unique constraint errors
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'A record with this information already exists',
        errors: err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token, please log in again'
      });
    }
    
    // Token expiration errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired, please log in again'
      });
    }
  
    // Return the error response
    res.status(statusCode).json(errorResponse);
  };
  
  module.exports = { notFound, errorHandler };