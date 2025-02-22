// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const {
  validateCreateUser,
  validateUpdateUser,
  validateDeleteUser,
} = require("../middleware/validate");

// Create new user
router.post("/", validateCreateUser, userController.createUser);

// Get all users
router.get("/", userController.getUsers);

// Get user by ID
router.get("/:id", validateDeleteUser, userController.getUserById);

// Update user
router.put("/:id", validateUpdateUser, userController.updateUser);

// Delete user
router.delete("/:id", validateDeleteUser, userController.deleteUser);

module.exports = router;
