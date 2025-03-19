// src/validations/eventValidations.js
const { body } = require('express-validator');

// Event creation validation
exports.validateEventCreation = [
  body('title')
    .notEmpty()
    .withMessage('Event title is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Event title must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim(),
  
  body('startDate')
    .optional() // Changed from notEmpty() to optional()
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .toDate(),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .toDate()
    .custom((endDate, { req }) => {
      if (endDate && req.body.startDate && new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  // Rest of the validations remain the same
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),

  body('location.name')
    .optional()
    .isString()
    .trim(),
  
  body('category')
    .optional()
    .isString()
    .trim()
    .isIn(['general', 'birthday', 'holiday', 'appointment', 'social', 'other'])
    .withMessage('Category must be one of: general, birthday, holiday, appointment, social, other'),
  
  body('recurring')
    .optional()
    .isObject()
    .withMessage('Recurring settings must be an object'),
  
  body('reminders')
    .optional()
    .isArray()
    .withMessage('Reminders must be an array')
];

// The rest of your validations remain the same