// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Import the user controller
// Make sure this file exists and properly exports these functions
const { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile, 
    getAllUsers 
} = require('../controllers/userController');

// User routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/', protect, getAllUsers);

module.exports = router;