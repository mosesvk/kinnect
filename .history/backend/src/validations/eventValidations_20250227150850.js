// src/validations/eventValidations.js
const { body, param, query } = require('express-validator');

const eventValidation = {
  // Create a new event
  createEvent: [
    body('familyId')
      .isMongoId()
      .withMessage('Valid family ID is required'),
    
    body('title')
      .notEmpty()
      .withMessage('Event title is required')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    
    body('startDate')
      .isISO8601()
      .withMessage('Valid start date is required'),
    
    body('endDate')
      .isISO8601()
      .withMessage('Valid end date is required')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters'),
    
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object'),
    
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of [longitude, latitude]'),
    
    body('location.address')
      .optional()
      .isString()
      .withMessage('Address must be a string'),
    
    body('recurring.frequency')
      .optional()
      .isIn(['none', 'daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Invalid recurring frequency'),
    
    body('recurring.endDate')
      .optional()
      .isISO8601()
      .withMessage('Valid recurring end date is required'),
    
    body('attendees')
      .optional()
      .isArray()
      .withMessage('Attendees must be an array'),
    
    body('attendees.*.userId')
      .optional()
      .isMongoId()
      .withMessage('Valid user ID is required for attendees'),
    
    body('reminders')
      .optional()
      .isArray()
      .withMessage('Reminders must be an array'),
    
    body('reminders.*.time')
      .optional()
      .isNumeric()
      .withMessage('Reminder time must be a number'),
    
    body('category')
      .optional()
      .isString()
      .withMessage('Category must be a string')
  ],

  // Update an event
  updateEvent: [
    param('eventId')
      .isMongoId()
      .withMessage('Valid event ID is required'),
    
    body('title')
      .optional()
      .notEmpty()
      .withMessage('Event title cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Title cannot exceed 100 characters'),
    
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Valid start date is required'),
    
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('Valid end date is required')
      .custom((value, { req }) => {
        if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    
    // Other fields similar to createEvent
  ],

  // Get events by family
  getEventsByFamily: [
    param('familyId')
      .isMongoId()
      .withMessage('Valid family ID is required'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Valid start date is required'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Valid end date is required'),
    
    query('category')
      .optional()
      .isString()
      .withMessage('Category must be a string')
  ],

  // Update event attendance status
  updateAttendance: [
    param('eventId')
      .isMongoId()
      .withMessage('Valid event ID is required'),
    
    body('status')
      .isIn(['accepted', 'declined', 'pending'])
      .withMessage('Status must be accepted, declined, or pending')
  ]
};

module.exports = eventValidation;