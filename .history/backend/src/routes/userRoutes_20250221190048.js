// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const userValidation = require('../validations/userValidation');
const User = require('../models/User');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'User routes are working' });
});

// Register route
router.post('/register', userValidation.register, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, firstName, lastName } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'User already exists' 
            });
        }

        // Create new user
        const user = new User({
            email,
            passwordHash: password,
            firstName,
            lastName
        });

        await user.save();

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Error registering user' 
        });
    }
});

module.exports = router;