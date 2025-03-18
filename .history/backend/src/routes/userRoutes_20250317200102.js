// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { validateUserRegistration } = require("../validations/userValidations");
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers, // Make sure this function is exported from userController.js
} = require("../controllers/userController");

// User routes
router.post("/register", validateUserRegistration, registerUser); // register
router.post("/login", validateUserLogin, loginUser); // Login user
router.get("/profile", protect, getUserProfile); // Get user profile
router.put("/profile", protect, updateUserProfile); // Update user profile
router.post;

// Admin route - make sure getAllUsers is defined in userController.js
router.get("/", protect, getAllUsers); // Get all users

module.exports = router;
