const Family = require('../models/Family');
const User = require('../models/User');

const familyController = {
  // Create a new family
  createFamily: async (req, res) => {
    try {
      const { name, settings } = req.body;
      const userId = req.user._id;

      console.log('Creating family with user:', userId);
      
      // Create the family
      const family = new Family({
        name,
        createdBy: userId,
        members: [{
          userId,
          role: 'admin',
          permissions: ['read', 'write', 'admin']
        }],
        settings
      });
      
      await family.save();
      
      // Update the user's familyRoles
      await User.findByIdAndUpdate(userId, {
        $push: {
          familyRoles: {
            familyId: family._id,
            role: 'owner'
          }
        }
      });

      res.status(201).json({
        success: true,
        data: family
      });
    } catch (error) {
      console.error('Create family error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating family',
        error: error.message
      });
    }
  },

  // Get all families user is member of
  getUserFamilies: async (req, res) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const userId = req.user._id;
      console.log('Fetching families for user:', userId);

      const families = await Family.find({
        'members.userId': userId
      }).populate('members.userId', 'firstName lastName email');

      console.log('Found families:', families);

      res.json({
        success: true,
        data: families
      });
    } catch (error) {
      console.error('Error in getUserFamilies:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching families',
        error: error.message
      });
    }
  },

  // Update family details
  updateFamily: async (req, res) => {
    try {
      const { familyId } = req.params;
      const { name, settings } = req.body;
      const userId = req.user._id;

      // Check if user has admin permissions
      const family = await Family.findOne({
        _id: familyId,
        'members': {
          $elemMatch: {
            userId,
            role: 'admin'
          }
        }
      });

      if (!family) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update family'
        });
      }

      const updatedFamily = await Family.findByIdAndUpdate(
        familyId,
        { $set: { name, settings } },
        { new: true }
      );

      res.json({
        success: true,
        data: updatedFamily
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating family',
        error: error.message
      });
    }
  },

  // Add member to family
  addFamilyMember: async (req, res) => {
    try {
      const { familyId } = req.params;
      const { userId, role, permissions } = req.body;
      const requestingUserId = req.user._id;

      // Check if requesting user has admin permissions
      const family = await Family.findOne({
        _id: familyId,
        'members': {
          $elemMatch: {
            userId: requestingUserId,
            role: 'admin'
          }
        }
      });

      if (!family) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add members'
        });
      }

      // Check if user is already a member
      const isMember = family.members.some(member => 
        member.userId.toString() === userId
      );

      if (isMember) {
        return res.status(400).json({
          success: false,
          message: 'User is already a family member'
        });
      }

      // Add new member to family
      family.members.push({
        userId,
        role,
        permissions,
        joinedAt: new Date()
      });

      await family.save();

      // Add family to user's familyRoles
      await User.findByIdAndUpdate(userId, {
        $push: {
          familyRoles: {
            familyId: family._id,
            role: role === 'admin' ? 'admin' : 'member'
          }
        }
      });

      res.json({
        success: true,
        data: family
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error adding family member',
        error: error.message
      });
    }
  },

  // Remove member from family
  removeFamilyMember: async (req, res) => {
    try {
      const { familyId, memberId } = req.params;
      const requestingUserId = req.user._id;

      // Check if requesting user has admin permissions
      const family = await Family.findOne({
        _id: familyId,
        'members': {
          $elemMatch: {
            userId: requestingUserId,
            role: 'admin'
          }
        }
      });

      if (!family) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to remove members'
        });
      }

      // Remove member from family
      await Family.findByIdAndUpdate(familyId, {
        $pull: {
          members: { userId: memberId }
        }
      });

      // Remove family from user's familyRoles
      await User.findByIdAndUpdate(memberId, {
        $pull: {
          familyRoles: { familyId }
        }
      });

      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error removing family member',
        error: error.message
      });
    }
  }
};

module.exports = familyController;