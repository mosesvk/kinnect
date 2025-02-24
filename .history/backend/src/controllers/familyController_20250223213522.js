const Family = require('../models/Family');

const familyController = {
  // Create a new family
  createFamily: async (req, res) => {
    try {

        console.log(req)
      const { name, settings } = req.body;
      const userId = req.user._id; // Assuming user is authenticated

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

      res.status(201).json({
        success: true,
        data: family
      });
    } catch (error) {
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
      const userId = req.user._id;
      const families = await Family.find({
        'members.userId': userId
      }).populate('members.userId', 'firstName lastName email');

      res.json({
        success: true,
        data: families
      });
    } catch (error) {
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

      // Add new member
      family.members.push({
        userId,
        role,
        permissions,
        joinedAt: new Date()
      });

      await family.save();

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
  }
};

module.exports = familyController;