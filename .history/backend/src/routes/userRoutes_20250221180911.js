const express = require('express');
const router = express.Router();
const { 
    createUser, 
    getUsers, 
    getUserById, 
    updateUser, 
    deleteUser 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validateUser } = require('../middleware/validationMiddleware');

// Public routes
router.post('/', validateUser, createUser);

// Protected routes
router.get('/', protect, getUsers);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, validateUser, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;