// src/middleware/validationMiddleware.js
const { body, param, validationResult } = require('express-validator');

// Validation rules
const createUserRules = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required'),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required'),
    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    body('phone')
        .optional()
        .trim()
        .matches(/^\+?[\d\s-]+$/)
        .withMessage('Invalid phone number format'),
    body('address')
        .optional()
        .isObject()
        .withMessage('Address must be an object')
];

const updateUserRules = [
    param('id')
        .isMongoId()
        .withMessage('Invalid user ID'),
    body('firstName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('First name cannot be empty'),
    body('lastName')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Last name cannot be empty'),
    body('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    body('phone')
        .optional()
        .trim()
        .matches(/^\+?[\d\s-]+$/)
        .withMessage('Invalid phone number format'),
    body('address')
        .optional()
        .isObject()
        .withMessage('Address must be an object')
];

const deleteUserRules = [
    param('id')
        .isMongoId()
        .withMessage('Invalid user ID')
];

// Middleware to validate the request
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Export validation chains combined with the validation middleware
module.exports = {
    validateCreateUser: [...createUserRules, validate],
    validateUpdateUser: [...updateUserRules, validate],
    validateDeleteUser: [...deleteUserRules, validate]
};