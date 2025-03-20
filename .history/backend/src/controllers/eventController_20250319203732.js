// src/controllers/eventController.js
const Event = require("../models/Event");
const EventAttendee = require("../models/EventAttendee");
const FamilyMember = require("../models/FamilyMember");
const { sequelize } = require("../config/db");
const { Op } = require("sequelize");

// @desc    Create a new event
// @route   POST /api/families/:familyId/events
// @access  Private
exports.createEvent = async (req, res) => {
  try {
    const { familyId } = req.params;
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      category,
      recurring,
      reminders,
    } = req.body;

    // Check if user is a member of this family
    const membership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create events for this family",
      });
    }

    // Create event
    const event = await Event.create({
      familyId,
      title,
      description,
      startDate,
      endDate,
      location,
      category,
      recurring,
      reminders,
      createdById: req.user.id,
    });

    // Add creator as attendee
    await EventAttendee.create({
      eventId: event.id,
      userId: req.user.id,
      status: "attending",
    });

    // Get all family members
    const familyMembers = await FamilyMember.findAll({
      where: { familyId },
    });

    // Add all members as "pending" attendees
    const attendeeRecords = familyMembers.map((member) => ({
      eventId: event.id,
      userId: member.userId,
      status: member.userId === req.user.id ? "attending" : "pending",
    }));

    await EventAttendee.bulkCreate(attendeeRecords);

    res.status(201).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all events for a family
// @route   GET /api/families/:familyId/events
// @access  Private
exports.getFamilyEvents = async (req, res) => {
  try {
    const { familyId } = req.params;
    const { startDate, endDate, category } = req.query;

    // Check if user is a member of this family
    const membership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view events for this family",
      });
    }

    // Build query filters
    const queryOptions = {
      where: { familyId },
      order: [["startDate", "ASC"]],
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      queryOptions.where.startDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      queryOptions.where.startDate = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      queryOptions.where.startDate = {
        [Op.lte]: new Date(endDate),
      };
    }

    // Add category filter if provided
    if (category) {
      queryOptions.where.category = category;
    }

    // Get events
    const events = await Event.findAll(queryOptions);

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Private
exports.getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;

    // Get the event with attendees
    const event = await Event.findByPk(eventId, {
      include: [
        {
          model: EventAttendee,
          as: "attendees",
          include: ["user"], // This assumes you have the right association
        },
      ],
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this event",
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
exports.updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const updates = req.body;

    // Get the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
      },
    });

    // Check if user is the creator or an admin of the family
    if (!(event.createdById === req.user.id || membership?.role === "admin")) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this event",
      });
    }

    // Update event fields
    const allowedUpdates = [
      "title",
      "description",
      "startDate",
      "endDate",
      "location",
      "category",
      "recurring",
      "reminders",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        event[field] = updates[field];
      }
    });

    await event.save();

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    // Get the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
      },
    });

    // Check if user is the creator or an admin of the family
    if (!(event.createdById === req.user.id || membership?.role === "admin")) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this event",
      });
    }

    // Delete attendees first (due to foreign key constraints)
    await EventAttendee.destroy({
      where: { eventId },
    });

    // Delete the event
    await event.destroy();

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Manage event attendance (RSVP)
// @route   POST /api/events/:id/attendees
// @access  Private
exports.manageAttendance = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { status, userId } = req.body;

    // Validate status
    const validStatuses = ["attending", "maybe", "declined"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be attending, maybe, or declined",
      });
    }

    // Get the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if the user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to respond to this event",
      });
    }

    // If updating another user's status, check if current user is admin
    const targetUserId = userId || req.user.id;
    if (targetUserId !== req.user.id && membership.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update attendance for other users",
      });
    }

    // If updating another user, check if they are a family member
    if (targetUserId !== req.user.id) {
      const targetMembership = await FamilyMember.findOne({
        where: {
          familyId: event.familyId,
          userId: targetUserId,
        },
      });

      if (!targetMembership) {
        return res.status(400).json({
          success: false,
          message: "The specified user is not a member of this family",
        });
      }
    }

    // Check if attendance record already exists
    let attendance = await EventAttendee.findOne({
      where: {
        eventId,
        userId: targetUserId,
      },
    });

    if (attendance) {
      // Update existing record
      attendance.status = status;
      await attendance.save();
    } else {
      // Create new attendance record
      attendance = await EventAttendee.create({
        eventId,
        userId: targetUserId,
        status,
      });
    }

    res.json({
      success: true,
      attendance,
    });
  } catch (error) {
    console.error("Manage attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all attendees for an event
// @route   GET /api/events/:id/attendees
// @access  Private
exports.getEventAttendees = async (req, res) => {
  try {
    const eventId = req.params.id;

    // Get the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view attendees for this event",
      });
    }

    // Get all attendees
    const attendees = await EventAttendee.findAll({
      where: { eventId },
      include: ["user"], // This assumes you have the right association
    });

    res.json({
      success: true,
      count: attendees.length,
      attendees,
    });
  } catch (error) {
    console.error("Get attendees error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
