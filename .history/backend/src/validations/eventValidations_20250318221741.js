// src/validations/eventValidations.js
const { body } = require("express-validator");

// Event creation validation
exports.validateEventCreation = [
  body("title")
    .notEmpty()
    .withMessage("Event title is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Event title must be between 2 and 100 characters"),

  body("description").optional().trim(),

  body("startDate")
    .optional() // Changed from notEmpty() to optional()
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate()
    .custom((endDate, { req }) => {
      if (
        endDate &&
        req.body.startDate &&
        new Date(endDate) <= new Date(req.body.startDate)
      ) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be an object"),

  body("location.name").optional().isString().trim(),

  body("category")
    .optional()
    .isString()
    .trim()
    .isIn(["general", "birthday", "holiday", "appointment", "social", "other"])
    .withMessage(
      "Category must be one of: general, birthday, holiday, appointment, social, other"
    ),

  body("recurring")
    .optional()
    .isObject()
    .withMessage("Recurring settings must be an object"),

  body("reminders")
    .optional()
    .isArray()
    .withMessage("Reminders must be an array"),
];

// Event update validation
exports.validateEventUpdate = [
  body("title")
    .optional()
    .notEmpty()
    .withMessage("Event title cannot be empty if provided")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Event title must be between 2 and 100 characters"),

  body("description").optional().trim(),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date")
    .toDate(),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date")
    .toDate()
    .custom((endDate, { req }) => {
      if (
        endDate &&
        req.body.startDate &&
        new Date(endDate) <= new Date(req.body.startDate)
      ) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),

  body("location")
    .optional()
    .isObject()
    .withMessage("Location must be an object"),

  body("category")
    .optional()
    .isString()
    .trim()
    .isIn(["general", "birthday", "holiday", "appointment", "social", "other"])
    .withMessage(
      "Category must be one of: general, birthday, holiday, appointment, social, other"
    ),

  body("recurring")
    .optional()
    .isObject()
    .withMessage("Recurring settings must be an object"),

  body("reminders")
    .optional()
    .isArray()
    .withMessage("Reminders must be an array"),
];

// Attendance management validation
exports.validateAttendance = [
  body("status")
    .notEmpty()
    .withMessage("Attendance status is required")
    .isString()
    .isIn(["attending", "maybe", "declined"])
    .withMessage("Status must be attending, maybe, or declined"),

  body("userId")
    .optional()
    .isUUID()
    .withMessage("User ID must be a valid UUID"),
];
