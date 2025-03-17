// src/validations/familyValidations.js
const { body } = require('express-validator');

// Family creation validation
exports.validateFamilyCreation = [
  body('name')
    .notEmpty()
    .withMessage('Family name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Family name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  
  body('settings.privacyLevel')
    .optional()
    .isIn(['private', 'public', 'friends'])
    .withMessage('Privacy level must be private, public, or friends')
];

// Family update validation
exports.validateFamilyUpdate = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Family name cannot be empty if provided')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Family name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  
  body('settings.privacyLevel')
    .optional()
    .isIn(['private', 'public', 'friends'])
    .withMessage('Privacy level must be private, public, or friends')
];

// Family member addition validation
exports.validateFamilyMemberAddition = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('role')
    .optional()
    .isIn(['admin', 'member', 'viewer'])
    .withMessage('Role must be admin, member, or viewer'),
  
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
];