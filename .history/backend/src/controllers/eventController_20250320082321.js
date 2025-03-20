// src/controllers/eventController.js
const Event = require("../models/Event");
const EventAttendee = require("../models/EventAttendee");
const FamilyMember = require("../models/FamilyMember");
const EventInvitation = require('../models/EventInvitation')
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

    const targetUserId = userId || req.user.id;

    // Check if the user is a member of the family this event belongs to
    const membership = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
      },
    });

    // Check if user has been invited to this event (if not a family member)
    const invitation = !membership
      ? await EventInvitation.findOne({
          where: {
            eventId,
            userId: req.user.id,
            status: "accepted",
          },
        })
      : null;

    // User must either be a family member or have an accepted invitation
    if (!membership && !invitation) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to respond to this event",
      });
    }

    // If updating another user's status, check if current user is admin
    if (targetUserId !== req.user.id) {
      const isCreator = event.createdById === req.user.id;
      const isAdmin = membership && membership.role === "admin";

      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update attendance for other users",
        });
      }

      // If target user is not family member, check if they're invited
      const targetMembership = await FamilyMember.findOne({
        where: {
          familyId: event.familyId,
          userId: targetUserId,
        },
      });

      if (!targetMembership) {
        const targetInvitation = await EventInvitation.findOne({
          where: {
            eventId,
            userId: targetUserId,
            status: "accepted",
          },
        });

        if (!targetInvitation) {
          return res.status(400).json({
            success: false,
            message:
              "The specified user has not accepted an invitation to this event",
          });
        }
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

// Send an invitation to a user from another family
exports.sendEventInvitation = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { userId, message } = req.body;

    // Get the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if the current user is the creator or an admin
    const isCreator = event.createdById === req.user.id;
    const isAdmin = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
        role: "admin",
      },
    });

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the event creator or family admin can send invitations",
      });
    }

    // Check if user exists
    const userToInvite = await User.findByPk(userId);
    if (!userToInvite) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is already a member of this family
    const isFamilyMember = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId,
      },
    });

    if (isFamilyMember) {
      return res.status(400).json({
        success: false,
        message:
          "User is already a member of this family - no invitation needed",
      });
    }

    // Check if invitation already exists
    const existingInvitation = await EventInvitation.findOne({
      where: {
        eventId,
        userId,
      },
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: "User has already been invited to this event",
      });
    }

    // Create invitation
    const invitation = await EventInvitation.create({
      eventId,
      userId,
      invitedBy: req.user.id,
      message: message || null,
      status: "pending",
    });

    // TODO: Send notification to user about the invitation

    res.status(201).json({
      success: true,
      invitation,
    });
  } catch (error) {
    console.error("Send invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all invitations for an event
exports.getEventInvitations = async (req, res) => {
  try {
    const { id: eventId } = req.params;

    // Get the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user is the creator or an admin
    const isCreator = event.createdById === req.user.id;
    const isAdmin = await FamilyMember.findOne({
      where: {
        familyId: event.familyId,
        userId: req.user.id,
        role: "admin",
      },
    });

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only the event creator or family admin can view invitations",
      });
    }

    // Get all invitations
    const invitations = await EventInvitation.findAll({
      where: { eventId },
      include: [
        {
          model: User,
          attributes: ["id", "firstName", "lastName", "email", "profileImage"],
        },
      ],
    });

    res.json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    console.error("Get invitations error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update an invitation (accept/decline)
exports.updateEventInvitation = async (req, res) => {
  try {
    const { id: eventId, invitationId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either accepted or declined",
      });
    }

    // Get the invitation
    const invitation = await EventInvitation.findOne({
      where: {
        id: invitationId,
        eventId,
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    // Only the invited user can update the invitation
    if (invitation.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this invitation",
      });
    }

    // Update invitation status
    invitation.status = status;
    await invitation.save();

    // If accepted, add user to event attendees
    if (status === "accepted") {
      await EventAttendee.create({
        eventId,
        userId: req.user.id,
        status: "attending",
      });
    }

    res.json({
      success: true,
      invitation,
    });
  } catch (error) {
    console.error("Update invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
