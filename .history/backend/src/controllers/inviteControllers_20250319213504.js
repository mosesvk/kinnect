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
