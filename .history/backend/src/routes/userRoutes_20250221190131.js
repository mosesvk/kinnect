// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userValidation = require('../validations/userValidations');
const validate = require('../middleware/validate');

// Auth routes
router.post('/register', 
    validate(userValidation.register),
    userController.register
);

// router.post('/login',
//     validate(userValidation.login),
//     userController.login
// );

// // Profile routes
// router.put('/profile',
//     validate(userValidation.updateProfile),
//     userController.updateProfile
// );

module.exports = router;