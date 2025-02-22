// src/middleware/validate.js
const { validationResult } = require('express-validator');

/**
 * Middleware to validate request data
 * @param validations Array of validation chains to execute
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Execute all validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(err => ({
                    field: err.param,
                    message: err.msg
                }))
            });
        }

        next();
    };
};

module.exports = validate;