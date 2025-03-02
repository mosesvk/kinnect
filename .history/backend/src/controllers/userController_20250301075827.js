// controllers/userController.js
const { User, Family, FamilyMember } = require('./models');
const { generateToken } = require('../utils/jwt');
const { sequelize } = require('../config/database');

const userController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Create new user
      const user = await User.create({
        email,
        passwordHash: password, // Will be hashed by hook
        firstName,
        lastName,
        lastLogin: new Date()
      });

      const token = generateToken(user.id);

      // Remove sensitive data before sending response
      const userResponse = user.toJSON();
      delete userResponse.passwordHash;

      res.status(201).json({
        success: true,
        data: {
          token,
          user: userResponse,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({
        success: false,
        message: "Error registering user",
        error: error.message
      });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });
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
      const token = generateToken(user.id);

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
            id: user.id,
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
        error: error.message
      });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      const userId = req.params.id;

      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      
      // Update user
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      user.email = email || user.email;
      
      await user.save();
      
      // Remove passwordHash from response
      const userResponse = user.toJSON();
      delete userResponse.passwordHash;

      res.json({
        success: true,
        data: userResponse,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile",
        error: error.message
      });
    }
  },

  // Delete user profile
  deleteProfile: async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
      const userId = req.user.id;

      // 1. Find the user
      const user = await User.findByPk(userId, { transaction: t });
      
      if (!user) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      
      // 2. Delete family memberships
      await FamilyMember.destroy({
        where: { userId },
        transaction: t
      });
      
      // 3. Find families where user was the only member
      const emptyFamilies = await Family.findAll({
        include: [{
          model: FamilyMember,
          attributes: ['id'],
          required: false
        }],
        where: {
          createdById: userId
        },
        transaction: t
      });
      
      const emptyFamilyIds = emptyFamilies
        .filter(family => family.FamilyMembers.length === 0)
        .map(family => family.id);
      
      // 4. Delete empty families
      if (emptyFamilyIds.length > 0) {
        await Family.destroy({
          where: { id: emptyFamilyIds },
          transaction: t
        });
      }
      
      // 5. Delete the user
      await user.destroy({ transaction: t });
      
      // Commit transaction
      await t.commit();

      res.status(200).json({
        success: true,
        message: "Profile successfully deleted",
      });
    } catch (error) {
      // Rollback transaction on error
      await t.rollback();
      
      console.error("Delete profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting profile",
        error: error.message
      });
    }
  },
};

module.exports = userController;