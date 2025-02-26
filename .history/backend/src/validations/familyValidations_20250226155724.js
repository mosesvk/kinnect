// src/validations/familyValidations.js
const { body, param } = require("express-validator");

const familyValidation = {
  // Create a new family
  createFamily: [
    body("name")
      .notEmpty()
      .withMessage("Family name is required")
      .isLength({ min: 2, max: 50 })
      .withMessage("Family name must be between 2 and 50 characters"),

    body("settings")
      .optional()
      .isObject()
      .withMessage("Settings must be an object"),
  ],

  // Join a family using invitation code
  joinFamily: [
    body("invitationCode")
      .notEmpty()
      .withMessage("Invitation code is required")
      .isLength({ min: 6 })
      .withMessage("Invalid invitation code format"),
  ],

  // Update family details
  updateFamily: [
    param("familyId").isMongoId().withMessage("Invalid family ID format"),

    body("name")
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage("Family name must be between 2 and 50 characters"),

    body("settings")
      .optional()
      .isObject()
      .withMessage("Settings must be an object"),
  ],

  // Add a member to family
  addFamilyMember: [
    param("familyId").isMongoId().withMessage("Invalid family ID format"),

    body("userId").isMongoId().withMessage("Invalid user ID format"),

    body("role")
      .isIn(["admin", "member"])
      .withMessage("Role must be either admin or member"),

    body("permissions").isArray().withMessage("Permissions must be an array"),
  ],
};

module.exports = familyValidation;
