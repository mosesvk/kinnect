// src/controllers/userController.js
const User = require("../models/User");
const { generateToken } = require("../utils/jwt");

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
          message: "User already exists",
        });
      }

      // Create new user
      const user = new User({
        email,
        passwordHash: password, // Note: This will be hashed by the model's pre-save middleware
        firstName,
        lastName,
      });
      console.log("Attempting to save user:", user);
      await user.save();
      console.log("User saved successfully. ID:", user._id);

      // Add your JWT token generation
      // This is the perfect spot because:
      // 1. We've confirmed the user doesn't already exist
      // 2. We've successfully saved the user
      // 3. We have access to the user._id
      // 4. It's before we send the response

      const jwt = generateToken(user._id)

      user.lastLogin = new Date() 
      await user.save()

      // Remove sensitive data before sending response
      const userResponse = user.toObject();
      delete userResponse.passwordHash;

      res.status(201).json({
        success: true,
        data: userResponse,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({
        success: false,
        message: "Error registering user",
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
          message: "Invalid credentials",
        });
      }

      // Validate password
      const isValid = await user.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate JWT token
      const token = generateToken(user._id);

      // Update last login timestamp
      user.lastLogin = new Date();
      await user.save();

      // Return success response with token and user data
      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Error logging in",
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
          email,
        },
        { new: true }
      ).select("-passwordHash");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
      });
    }
  },
};

module.exports = userController;
