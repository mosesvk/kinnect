// src/controllers/userController.js
const User = require("../models/User");
const Family = require('../models/Family')
const { generateToken } = require("../utils/jwt");
const mongoose = require('mongoose')

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

      const token = generateToken(user._id);

      user.lastLogin = new Date();
      await user.save();

      // Remove sensitive data before sending response
      const userResponse = user.toObject();
      delete userResponse.passwordHash;

      res.status(201).json({
        success: true,
        data: {
          token,
          userResponse,
        },
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
      // console.log('udpateProfile', {body: req.body, user: req.user, params: req.pdarams})
      const { firstName, lastName, email } = req.body;
      // Assuming you have the usedddddr ID from authentication middleware
      const userId = req.params.id;

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

  // Delete user profile
  deleteProfile: async (req, res) => {
    try {
      const userId = req.user._id;

      // Start a session for transaction
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // 1. Remove user from all families they're a member of
        await Family.updateMany(
          { "members.userId": userId },
          { $pull: { members: { userId: userId } } },
          { session }
        );

        // 2. Find families where this user was the only member
        const emptyFamilies = await Family.find(
          { members: { $size: 0 } },
          null,
          { session }
        );

        // 3. Delete empty families
        if (emptyFamilies.length > 0) {
          await Family.deleteMany(
            { _id: { $in: emptyFamilies.map((f) => f._id) } },
            { session }
          );
        }

        // 4. Delete the user
        const deletedUser = await User.findByIdAndDelete(userId, { session });

        if (!deletedUser) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        // Commit the transaction
        await session.commitTransaction();

        res.status(200).json({
          success: true,
          message: "Profile successfully deleted",
        });
      } catch (error) {
        // If an error occurs, abort the transaction
        await session.abortTransaction();
        throw error;
      } finally {
        // End the session
        session.endSession();
      }
    } catch (error) {
      console.error("Delete profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting profile",
      });
    }
  },
};

module.exports = userController;
