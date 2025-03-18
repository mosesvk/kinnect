// src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validateUserUpdate,
  validateUserDeletion 
} = require("../validations/userValidations");
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getAllUsers,
} = require("../controllers/userController");

// User routes
router.post("/register", validateUserRegistration, registerUser);
router.post("/login", validateUserLogin, loginUser);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, validateUserUpdate, updateUserProfile);
router.delete("/profile", protect, validateUserDeletion, deleteUserProfile);

// Admin route
router.get("/", protect, getAllUsers);

module.exports = router;