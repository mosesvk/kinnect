// tests/helpers/validation-test-helper.js
const express = require("express");
const { validationResult } = require("express-validator");

/**
 * Creates a test app for validation testing with properly formatted error responses
 * @param {Object} validations - Object with validation chains
 * @returns {Object} Express app configured for validation testing
 */
const createValidationTestApp = (validations) => {
  const app = express();
  app.use(express.json());

  // Add test routes for each validation
  for (const [name, validation] of Object.entries(validations)) {
    app.post(`/test/${name}`, async (req, res, next) => {
      try {
        // Run all validations
        for (const validator of validation) {
          await validator.run(req);
        }

        // Get validation errors using express-validator's validationResult
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
          // Format errors to match the expected format
          const formattedErrors = errors.array().map((err) => ({
            field: err.path || err.param,
            message: err.msg,
          }));

          return res.status(400).json({
            success: false,
            errors: formattedErrors,
          });
        }

        // No errors, return success
        res.json({
          success: true,
          data: req.body,
        });
      } catch (error) {
        console.log("Validation errors:", error.array());

        res.status(500).json({
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });
  }


  return app;
};

module.exports = {
  createValidationTestApp,
};
