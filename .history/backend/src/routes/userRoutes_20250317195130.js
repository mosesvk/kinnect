// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile, 
    getAllUsers  // Make sure this function is exported from userController.js
} = require('../controllers/userController');

// User routes
router.post('/', validateUserRegistration, registerUser);                   // Register new user
router.post('/register', registerUser);                 // Login user
router.post('/login', loginUser);                 // Login user
router.post('/:id', loginUser);                 // Login user
router.get('/profile', protect, getUserProfile);  // Get user profile
router.put('/profile', protect, updateUserProfile); // Update user profile

// Admin route - make sure getAllUsers is defined in userController.js
router.get('/', protect, getAllUsers);           // Get all users

module.exports = router;