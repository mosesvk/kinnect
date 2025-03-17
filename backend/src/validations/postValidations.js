// src/validations/postValidations.js
const { body } = require('express-validator');

// Post creation validation
exports.validatePostCreation = [
  body('content')
    .notEmpty()
    .withMessage('Post content is required')
    .trim(),
  
  body('mediaUrls')
    .optional()
    .isArray()
    .withMessage('Media URLs must be an array'),
  
  body('mediaUrls.*')
    .optional()
    .isURL()
    .withMessage('Each media URL must be a valid URL'),
  
  body('type')
    .optional()
    .isIn(['regular', 'memory', 'milestone', 'announcement'])
    .withMessage('Type must be regular, memory, milestone, or announcement'),
  
  body('privacy')
    .optional()
    .isIn(['family', 'public', 'private'])
    .withMessage('Privacy must be family, public, or private'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),

  body('familyIds')
    .isArray({ min: 1 })
    .withMessage('At least one family ID is required')
    .custom((value) => {
      if (!value.every(id => typeof id === 'string')) {
        throw new Error('Each family ID must be a string');
      }
      return true;
    }),
  
  body('eventIds')
    .optional()
    .isArray()
    .withMessage('Event IDs must be an array')
    .custom((value) => {
      if (value && !value.every(id => typeof id === 'string')) {
        throw new Error('Each event ID must be a string');
      }
      return true;
    })
];

// Post update validation
exports.validatePostUpdate = [
  body('content')
    .optional()
    .notEmpty()
    .withMessage('Content cannot be empty if provided')
    .trim(),
  
  body('mediaUrls')
    .optional()
    .isArray()
    .withMessage('Media URLs must be an array'),
  
  body('mediaUrls.*')
    .optional()
    .isURL()
    .withMessage('Each media URL must be a valid URL'),
  
  body('type')
    .optional()
    .isIn(['regular', 'memory', 'milestone', 'announcement'])
    .withMessage('Type must be regular, memory, milestone, or announcement'),
  
  body('privacy')
    .optional()
    .isIn(['family', 'public', 'private'])
    .withMessage('Privacy must be family, public, or private'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('familyIds')
    .optional()
    .isArray()
    .withMessage('Family IDs must be an array')
    .custom((value) => {
      if (value && value.length === 0) {
        throw new Error('At least one family ID is required');
      }
      if (value && !value.every(id => typeof id === 'string')) {
        throw new Error('Each family ID must be a string');
      }
      return true;
    }),
  
  body('eventIds')
    .optional()
    .isArray()
    .withMessage('Event IDs must be an array')
    .custom((value) => {
      if (value && !value.every(id => typeof id === 'string')) {
        throw new Error('Each event ID must be a string');
      }
      return true;
    })
];

// Comment validation
exports.validateComment = [
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  
  body('mediaUrl')
    .optional()
    .isURL()
    .withMessage('Media URL must be a valid URL'),
  
  body('parentId')
    .optional()
    .isUUID()
    .withMessage('Parent comment ID must be a valid UUID')
];