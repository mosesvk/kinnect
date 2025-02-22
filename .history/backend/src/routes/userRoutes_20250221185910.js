// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userValidation = require('../validations/userValidation');
const validate = require('../middleware/validate');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'User routes are working' });
});

// Register route
router.post('/register', 
    userValidation.register,
    userController.register
);

module.exports = router;