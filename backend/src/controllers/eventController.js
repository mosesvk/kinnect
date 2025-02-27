// src/controllers/eventController.js
const Event = require('../models/Event');
const Family = require('../models/Family');

const eventController = {
  // Create a new event
  createEvent: async (req, res) => {
    try {
      const { 
        familyId, title, description, startDate, endDate, 
        location, attendees, recurring, reminders, category 
      } = req.body;
      
      const userId = req.user._id;

      // Verify user is a member of the family
      const family = await Family.findOne({
        _id: familyId,
        'members.userId': userId
      });

      if (!family) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to create events for this family'
        });
      }

      // Create the event
      const event = new Event({
        familyId,
        title,
        description,
        startDate,
        endDate,
        location,
        createdBy: userId,
        category: category || 'general'
      });

      // Add creator as an attendee if not already included
      const creatorIncluded = attendees?.some(
        attendee => attendee.userId.toString() === userId.toString()
      );

      if (!creatorIncluded) {
        event.attendees = [{ userId, status: 'accepted' }, ...(attendees || [])];
      } else if (attendees) {
        event.attendees = attendees;
      }

      // Add recurring info if provided
      if (recurring && recurring.frequency !== 'none') {
        event.recurring = recurring;
      }

      // Add reminders if provided
      if (reminders && reminders.length > 0) {
        event.reminders = reminders;
      }

      await event.save();

      // Populate creator and attendees info
      await event.populate('createdBy', 'firstName lastName');
      await event.populate('attendees.userId', 'firstName lastName');

      res.status(201).json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating event',
        error: error.message
      });
    }
  },

  // Get all events for a family
  getEventsByFamily: async (req, res) => {
    try {
      const { familyId } = req.params;
      const { startDate, endDate, category } = req.query;
      const userId = req.user._id;

      // Verify user is a member of the family
      const family = await Family.findOne({
        _id: familyId,
        'members.userId': userId
      });

      if (!family) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view events for this family'
        });
      }

      // Build query
      const query = { familyId };

      // Add date range filter if provided
      if (startDate && endDate) {
        query.startDate = { $gte: new Date(startDate) };
        query.endDate = { $lte: new Date(endDate) };
      } else if (startDate) {
        query.startDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        query.endDate = { $lte: new Date(endDate) };
      }

      // Add category filter if provided
      if (category) {
        query.category = category;
      }

      // Fetch events
      const events = await Event.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('attendees.userId', 'firstName lastName')
        .sort({ startDate: 1 });

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching events',
        error: error.message
      });
    }
  },

  // Get a single event by ID
  getEventById: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user._id;

      const event = await Event.findById(eventId)
        .populate('createdBy', 'firstName lastName')
        .populate('attendees.userId', 'firstName lastName');

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Verify user is a member of the family
      const family = await Family.findOne({
        _id: event.familyId,
        'members.userId': userId
      });

      if (!family) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this event'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching event',
        error: error.message
      });
    }
  },

  // Update an event
  updateEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user._id;
      const updateData = req.body;

      // Find the event
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check if user is the creator or an admin of the family
      const family = await Family.findOne({
        _id: event.familyId,
        members: {
          $elemMatch: {
            userId,
            role: 'admin'
          }
        }
      });

      if (event.createdBy.toString() !== userId.toString() && !family) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this event'
        });
      }

      // Special handling for attendees to prevent overriding
      if (updateData.attendees) {
        // Keep existing attendees but update their status if included in the update
        const currentAttendees = event.attendees.map(a => ({
          userId: a.userId,
          status: a.status
        }));
        
        const updatedAttendees = updateData.attendees.map(a => ({
          userId: a.userId,
          status: a.status
        }));
        
        // Merge attendees lists
        const mergedAttendees = [...currentAttendees];
        
        updatedAttendees.forEach(updatedAttendee => {
          const existingIndex = mergedAttendees.findIndex(
            a => a.userId.toString() === updatedAttendee.userId.toString()
          );
          
          if (existingIndex >= 0) {
            mergedAttendees[existingIndex] = updatedAttendee;
          } else {
            mergedAttendees.push(updatedAttendee);
          }
        });
        
        updateData.attendees = mergedAttendees;
      }

      // Update the event
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $set: updateData },
        { new: true }
      )
        .populate('createdBy', 'firstName lastName')
        .populate('attendees.userId', 'firstName lastName');

      res.json({
        success: true,
        data: updatedEvent
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating event',
        error: error.message
      });
    }
  },

  // Delete an event
  deleteEvent: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user._id;

      // Find the event
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check if user is the creator or an admin of the family
      const family = await Family.findOne({
        _id: event.familyId,
        members: {
          $elemMatch: {
            userId,
            role: 'admin'
          }
        }
      });

      if (event.createdBy.toString() !== userId.toString() && !family) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this event'
        });
      }

      // Delete the event
      await Event.findByIdAndDelete(eventId);

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting event',
        error: error.message
      });
    }
  },

  // Update attendance status
  updateAttendance: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { status } = req.body;
      const userId = req.user._id;

      // Find the event
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Verify user is a member of the family
      const family = await Family.findOne({
        _id: event.familyId,
        'members.userId': userId
      });

      if (!family) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update attendance for this event'
        });
      }

      // Check if user is already an attendee
      const attendeeIndex = event.attendees.findIndex(
        attendee => attendee.userId.toString() === userId.toString()
      );

      if (attendeeIndex >= 0) {
        // Update existing attendee status
        event.attendees[attendeeIndex].status = status;
      } else {
        // Add user as a new attendee
        event.attendees.push({
          userId,
          status
        });
      }

      await event.save();
      await event.populate('attendees.userId', 'firstName lastName');

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Update attendance error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating attendance',
        error: error.message
      });
    }
  },

  // Get user's events across all families
  getUserEvents: async (req, res) => {
    try {
      const userId = req.user._id;
      const { startDate, endDate } = req.query;

      // Build query
      const query = {
        $or: [
          { 'attendees.userId': userId },
          { createdBy: userId }
        ]
      };

      // Add date range filter if provided
      if (startDate && endDate) {
        query.startDate = { $gte: new Date(startDate) };
        query.endDate = { $lte: new Date(endDate) };
      } else if (startDate) {
        query.startDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        query.endDate = { $lte: new Date(endDate) };
      }

      // Fetch events
      const events = await Event.find(query)
        .populate('familyId', 'name')
        .populate('createdBy', 'firstName lastName')
        .populate('attendees.userId', 'firstName lastName')
        .sort({ startDate: 1 });

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Get user events error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user events',
        error: error.message
      });
    }
  }
};

module.exports = eventController;