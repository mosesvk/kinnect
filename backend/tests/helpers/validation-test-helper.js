// tests/helpers/ValidationTestHelper.js
const express = require('express');
const bodyParser = require('body-parser');

/**
 * Creates a test app for validation testing with properly formatted error responses
 * @returns {Object} Express app configured for validation testing
 */
const createValidationTestApp = (validations) => {
  const app = express();
  app.use(bodyParser.json());
  
  // Add test routes for each validation
  for (const [name, validation] of Object.entries(validations)) {
    app.post(`/test/${name}`, async (req, res, next) => {
      try {
        // Execute all validations
        for (const validator of validation) {
          await validator.run(req);
        }
        
        // Get validation errors
        const errors = validation
          .map(validator => validator.errors)
          .flat()
          .filter(Boolean);
        
        if (errors.length > 0) {
          // Format errors to match test expectations
          const formattedErrors = errors.map(err => ({
            field: err.path,
            message: err.msg
          }));
          
          return res.status(400).json({
            success: false,
            errors: formattedErrors
          });
        }
        
        // No errors, return success
        res.json({
          success: true,
          data: req.body
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Server error',
          error: error.message
        });
      }
    });
  }
  
  return app;
};

module.exports = {
  createValidationTestApp
};