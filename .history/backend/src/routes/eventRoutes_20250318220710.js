// src/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateEventCreation, validateEventUpdate, validateAttendance } = require('../validations/eventValidations');
const {
  createEvent,
  getFamilyEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  manageAttendance,
  getEventAttendees
} = require('../controllers/eventController');

// Routes within /api/families/:familyId/events
router.post('/', protect, validate(validateEventCreation), createEvent);
router.get('/', protect, getFamilyEvents);

// Routes within /api/events
const eventRouter = express.Router();
eventRouter.get('/:id', protect, getEventById);
eventRouter.put('/:id', protect, validate(validateEventUpdate), updateEvent);
eventRouter.delete('/:id', protect, deleteEvent);
eventRouter.post('/:id/attendees', protect, validate(validateAttendance), manageAttendance);
eventRouter.get('/:id/attendees', protect, getEventAttendees);

module.exports = { 
  familyEventRoutes: router,
  eventRoutes: eventRouter
};