// src/validations/userValidation.js
const { body } = require('express-validator');

const userValidation = {
    // Common validations that might be reused
    commonFields: {
        firstName: body('firstName')
            .trim()
            .notEmpty()
            .withMessage('First name is required'),
        
        lastName: body('lastName')
            .trim()
            .notEmpty()
            .withMessage('Last name is required'),
        
        email: body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Must be a valid email address'),
        
        password: body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
    },

    // Validation chains for different operations
    register: [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('firstName').notEmpty().withMessage('First name is required'),
        body('lastName').notEmpty().withMessage('Last name is required')
    ],

    login: [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],

    updateProfile: [
        body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
        body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
        body('email').optional().isEmail().withMessage('Valid email is required')
    ]
};

module.exports = userValidation;