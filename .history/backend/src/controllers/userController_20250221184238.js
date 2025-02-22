// src/controllers/userController.js
const User = require('../models/User');

const userController = {
    // Register a new user
    register: async (req, res) => {
        try {
            const { email, password, firstName, lastName } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Create new user
            const user = new User({
                email,
                passwordHash: password, // Note: This will be hashed by the model's pre-save middleware
                firstName,
                lastName
            });

            await user.save();

            // Remove sensitive data before sending response
            const userResponse = user.toObject();
            delete userResponse.passwordHash;

            res.status(201).json({
                success: true,
                data: userResponse
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Error registering user'
            });
        }
    },

    // Login user
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Validate password
            const isValid = await user.validatePassword(password);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // TODO: Generate JWT token here if using authentication

            res.json({
                success: true,
                message: 'Login successful'
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Error logging in'
            });
        }
    },

    // Update user profile
    updateProfile: async (req, res) => {
        try {
            const { firstName, lastName, email } = req.body;
            // Assuming you have the user ID from authentication middleware
            const userId = req.user.id; 

            const user = await User.findByIdAndUpdate(
                userId,
                { 
                    firstName, 
                    lastName, 
                    email 
                },
                { new: true }
            ).select('-passwordHash');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating profile'
            });
        }
    }
};

module.exports = userController;