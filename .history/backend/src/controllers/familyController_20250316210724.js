// controllers/familyController.js
const Family = require("../models/Family");
const FamilyMember = require('../models/FamilyMember')
const User = require("../models/User");
const { sequelize } = require("../config/db");
const { Op } = require("sequelize");

// Helper function to validate UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

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

    // Since we have association issues, let's use a direct query approach instead
    const query = `
      SELECT 
        f.id, 
        f.name, 
        f.description, 
        f."createdBy", 
        f.settings, 
        f."createdAt", 
        f."updatedAt",
        fm.role AS "userRole", 
        fm.permissions AS "userPermissions", 
        fm."joinedAt"
      FROM 
        "Families" f
      JOIN 
        "FamilyMembers" fm ON f.id = fm."familyId"
      WHERE 
        fm."userId" = :userId
    `;

    // Get all results as an array
    const [results] = await sequelize.query(query, {
      replacements: { userId: req.user.id },
      type: sequelize.QueryTypes.SELECT,
    });

    // Add explicit check and logging for the families array
    let families = results;
    if (families && Array.isArray(families)) {
      console.log(`Found ${families.length} families for user`);
    } else {
      console.log("Query returned a non-array result:", families);
      // Ensure we have a valid array even if something unexpected happened
      families = Array.isArray(families) ? families : [];
    }

    // Return a properly formatted response
    res.json({
      success: true,
      count: families.length,
      families: families
    });
  } catch (error) {
    console.error("Get families error:", error);
    res.status(500).json({
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
    
    // Validate UUID format
    if (!isValidUUID(familyId)) {
      return res.status(404).json({
        success: false,
        message: "Family not found"
      });
    }

    // Check if user is a member of this family
    const membership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this family"
      });
    }

    // Get family with member details
    // Rest of your existing code
  } catch (error) {
    // Catch Sequelize database errors related to invalid UUIDs
    if (error.name === 'SequelizeDatabaseError' && 
        error.parent && 
        error.parent.code === '22P02' && 
        error.parent.routine === 'string_to_uuid') {
      return res.status(404).json({
        success: false,
        message: "Family not found"
      });
    }

    console.error("Get family error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
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
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(familyId) || !uuidRegex.test(userId)) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this family",
      });
    }

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

    // Rest of the function...
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
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(familyId)) {
      return res.status(404).json({
        success: false,
        message: "Family not found",
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

    // Only the creator can delete the family
    if (family.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the family creator can delete it",
      });
    }

    // Rest of the function...
  } catch (error) {
    console.error("Delete family error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
