const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile, 
    getAllUsers 
} = require('../controllers/userController');

// Updated routes to match test expectations
router.post('/', registerUser);                   // For /api/users
router.post('/login', loginUser);                 // For /api/users/login
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/', protect, getAllUsers);

module.exports = router;