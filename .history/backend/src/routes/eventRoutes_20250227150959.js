// src/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const eventValidation = require('../validations/eventValidations');

// Create a new event
router.post('/', 
  protect,
  validate(eventValidation.createEvent),
  eventController.createEvent
);

// Get events for a specific family
router.get('/family/:familyId', 
  protect,
  validate(eventValidation.getEventsByFamily),
  eventController.getEventsByFamily
);

// Get all user's events across all families
router.get('/user', 
  protect,
  eventController.getUserEvents
);

// Get a specific event by ID
router.get('/:eventId', 
  protect,
  eventController.getEventById
);

// Update an event
router.put('/:eventId', 
  protect,
  validate(eventValidation.updateEvent),
  eventController.updateEvent
);

// Delete an event
router.delete('/:eventId', 
  protect,
  eventController.deleteEvent
);

// Update attendance status
router.put('/:eventId/attendance', 
  protect,
  validate(eventValidation.updateAttendance),
  eventController.updateAttendance
);

module.exports = router;