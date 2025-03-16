// controllers/familyController.js
const { Family, FamilyMember } = require("../models/Family");
const User = require("../models/User");
const { Op } = require("sequelize");

// @desc    Create a new family
// @route   POST /api/families
// @access  Private
exports.createFamily = async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    // Check if required fields are provided
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Please provide a family name",
      });
    }

    // Create family
    const family = await Family.create({
      name,
      description,
      settings,
      createdBy: req.user.id,
    });

    // Add creator as admin member
    await FamilyMember.create({
      familyId: family.id,
      userId: req.user.id,
      role: "admin",
      permissions: ["view", "edit", "delete", "invite"],
    });

    res.status(201).json({
      success: true,
      family,
    });
  } catch (error) {
    console.error("Create family error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all families for the user
// @route   GET /api/families
// @access  Private
exports.getUserFamilies = async (req, res) => {
  try {
    console.log("Getting families for user ID:", req.user.id);

    // First, let's check if the user has any family memberships
    const membershipCount = await FamilyMember.count({
      where: { userId: req.user.id },
    });

    console.log("Found membership count:", membershipCount);

    if (membershipCount === 0) {
      // No memberships found for this user
      return res.json({
        success: true,
        message: "No families found for this user",
        count: 0,
        families: [],
      });
    }

    // Use raw query to debug database state
    const [rawMemberships] = await sequelize.query(
      `SELECT fm.id, fm.role, fm.permissions, fm."familyId", f.name, f.description 
       FROM "FamilyMembers" fm
       LEFT JOIN "Families" f ON fm."familyId" = f.id
       WHERE fm."userId" = :userId`,
      {
        replacements: { userId: req.user.id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    console.log(
      "Raw memberships query result:",
      JSON.stringify(rawMemberships, null, 2)
    );

    // Now try the original query with debug info
    const memberships = await FamilyMember.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Family,
        },
      ],
      logging: console.log, // Log the actual SQL query
    });

    console.log("Found memberships count:", memberships.length);
    console.log(
      "First membership:",
      memberships.length > 0
        ? JSON.stringify(
            {
              id: memberships[0].id,
              familyId: memberships[0].familyId,
              hasFamily: !!memberships[0].Family,
            },
            null,
            2
          )
        : "None"
    );

    // Extract the family data (with careful error handling)
    const families = [];
    for (const membership of memberships) {
      if (membership.Family) {
        families.push({
          ...membership.Family.dataValues,
          userRole: membership.role,
          userPermissions: membership.permissions,
          joinedAt: membership.joinedAt,
        });
      } else {
        console.log(
          `Missing Family for membership ID ${membership.id}, familyId: ${membership.familyId}`
        );
      }
    }

    return res.json({
      success: true,
      count: families.length,
      families,
      debug: {
        userID: req.user.id,
        membershipCount,
        membershipIds: memberships.map((m) => m.id),
        familyIds: memberships.map((m) => m.familyId),
      },
    });
  } catch (error) {
    console.error("Get families error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get family by ID
// @route   GET /api/families/:id
// @access  Private
exports.getFamilyById = async (req, res) => {
  try {
    const familyId = req.params.id;

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
        message: "Not authorized to access this family",
      });
    }

    // Get family with member details
    const family = await Family.findByPk(familyId, {
      include: [
        {
          model: FamilyMember,
          include: [
            {
              model: User,
              attributes: [
                "id",
                "firstName",
                "lastName",
                "email",
                "profileImage",
              ],
            },
          ],
        },
      ],
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    res.json({
      success: true,
      family,
      userRole: membership.role,
      userPermissions: membership.permissions,
    });
  } catch (error) {
    console.error("Get family error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update family details
// @route   PUT /api/families/:id
// @access  Private (Admin/Creator)
exports.updateFamily = async (req, res) => {
  try {
    const familyId = req.params.id;
    const { name, description, settings } = req.body;

    // Check if user has admin permissions
    const membership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id,
        role: "admin",
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this family",
      });
    }

    // Get the family
    const family = await Family.findByPk(familyId);

    if (!family) {
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    // Update fields
    family.name = name || family.name;
    family.description = description || family.description;
    family.settings = settings || family.settings;

    await family.save();

    res.json({
      success: true,
      family,
    });
  } catch (error) {
    console.error("Update family error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Add member to family
// @route   POST /api/families/:id/members
// @access  Private (Admin)
exports.addFamilyMember = async (req, res) => {
  try {
    const familyId = req.params.id;
    const { email, role, permissions } = req.body;

    // Check if user has admin permissions
    const adminMembership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id,
        role: "admin",
      },
    });

    if (!adminMembership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add members to this family",
      });
    }

    // Find the user to add by email
    const userToAdd = await User.findOne({ where: { email } });

    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    // Check if user is already a member
    const existingMembership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: userToAdd.id,
      },
    });

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this family",
      });
    }

    // Add the new member
    const memberRole = role || "member";
    const memberPermissions = permissions || ["view"];

    const membership = await FamilyMember.create({
      familyId,
      userId: userToAdd.id,
      role: memberRole,
      permissions: memberPermissions,
    });

    res.status(201).json({
      success: true,
      membership,
      user: {
        id: userToAdd.id,
        firstName: userToAdd.firstName,
        lastName: userToAdd.lastName,
        email: userToAdd.email,
      },
    });
  } catch (error) {
    console.error("Add family member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Remove member from family
// @route   DELETE /api/families/:id/members/:userId
// @access  Private (Admin)
exports.removeFamilyMember = async (req, res) => {
  try {
    const { id: familyId, userId } = req.params;

    // Check if user has admin permissions
    const adminMembership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id,
        role: "admin",
      },
    });

    if (!adminMembership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to remove members from this family",
      });
    }

    // Find the membership to remove
    const membershipToRemove = await FamilyMember.findOne({
      where: {
        familyId,
        userId,
      },
    });

    if (!membershipToRemove) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this family",
      });
    }

    // Don't allow removing the creator/last admin
    const family = await Family.findByPk(familyId);

    if (family.createdBy === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the family creator",
      });
    }

    // Count admins to ensure at least one remains
    if (membershipToRemove.role === "admin") {
      const adminCount = await FamilyMember.count({
        where: {
          familyId,
          role: "admin",
        },
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot remove the last admin from the family",
        });
      }
    }

    // Remove the membership
    await membershipToRemove.destroy();

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Remove family member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete a family
// @route   DELETE /api/families/:id
// @access  Private (Creator only)
exports.deleteFamily = async (req, res) => {
  try {
    const familyId = req.params.id;

    // Get the family
    const family = await Family.findByPk(familyId);

    if (!family) {
      return res.status(404).json({
        success: false,
        message: "Family not found",
      });
    }

    // Only the creator can delete the family
    if (family.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the family creator can delete it",
      });
    }

    // Delete all family members first (due to foreign key constraints)
    await FamilyMember.destroy({
      where: { familyId },
    });

    // Delete the family
    await family.destroy();

    res.json({
      success: true,
      message: "Family deleted successfully",
    });
  } catch (error) {
    console.error("Delete family error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
