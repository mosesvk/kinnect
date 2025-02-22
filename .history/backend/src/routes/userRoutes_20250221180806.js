// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userValidationRules = require('../middleware/validationMiddleware');
const { auth } = require('../middleware/auth');

// Create new user
router.post('/', 
  userValidationRules.createUser,
  userController.createUser
);

// Get all users
router.get('/',
  auth,
  userController.getUsers
);

// Get user by ID
router.get('/:id',
  auth,
  userValidationRules.deleteUser,
  userController.getUserById
);

// Update user
router.put('/:id',
  auth,
  userValidationRules.updateUser,
  userController.updateUser
);

// Delete user
router.delete('/:id',
  auth,
  userValidationRules.deleteUser,
  userController.deleteUser
);

module.exports = router;