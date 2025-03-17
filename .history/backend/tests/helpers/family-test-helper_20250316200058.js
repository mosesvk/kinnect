// tests/helpers/familyTestHelper.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Family = require('../../src/models/Family');
const FamilyMember = require('../../src/models/FamilyMember');
const { sequelize } = require('../../src/config/db');

/**
 * Helper class for creating test fixtures for family-related tests
 */
class FamilyTestHelper {
  /**
   * Create test users for family testing
   * @param {Object} options - Options for creating test users
   * @param {number} options.count - Number of users to create (default: 2)
   * @param {boolean} options.createAdmin - Whether to create an admin user (default: true)
   * @returns {Promise<Array>} Array of created users
   */
  static async createTestUsers({ count = 2, createAdmin = true } = {}) {
    const users = [];
    const hashedPassword = await bcrypt.hash('password123', 10);

    for (let i = 0; i < count; i++) {
      const user = await User.create({
        firstName: `Test${i}`,
        lastName: `User${i}`,
        email: `test${i}_${Date.now()}@example.com`,
        passwordHash: hashedPassword,
        role: createAdmin && i === 0 ? 'admin' : 'user'
      });
      
      users.push(user);
    }

    return users;
  }

  /**
   * Create a test family with members
   * @param {Object} options - Options for creating the family
   * @param {string} options.creatorId - User ID of the family creator (required)
   * @param {Array<string>} options.memberIds - Array of user IDs to add as members
   * @param {Object} options.familyData - Custom family data (name, description, settings)
   * @returns {Promise<Object>} Created family with helper methods
   */
  static async createTestFamily({
    creatorId,
    memberIds = [],
    familyData = {}
  }) {
    if (!creatorId) {
      throw new Error('Creator ID is required to create a test family');
    }

    // Create the family
    const family = await Family.create({
      name: familyData.name || 'Test Family',
      description: familyData.description || 'Family for testing',
      settings: familyData.settings || { privacyLevel: 'private' },
      createdBy: creatorId
    });

    // Add creator as admin
    await FamilyMember.create({
      familyId: family.id,
      userId: creatorId,
      role: 'admin',
      permissions: ['view', 'edit', 'delete', 'invite']
    });

    // Add other members
    for (const memberId of memberIds) {
      await FamilyMember.create({
        familyId: family.id,
        userId: memberId,
        role: 'member',
        permissions: ['view']
      });
    }

    // Enhance family object with test helper methods
    return {
      ...family.toJSON(),
      
      /**
       * Get all members of the family
       * @returns {Promise<Array>} Array of family members
       */
      async getMembers() {
        return await FamilyMember.findAll({
          where: { familyId: family.id }
        });
      },
      
      /**
       * Add a new member to the family
       * @param {string} userId - User ID to add
       * @param {string} role - Role (admin, member, viewer)
       * @param {Array<string>} permissions - Array of permissions
       * @returns {Promise<Object>} Created membership
       */
      async addMember(userId, role = 'member', permissions = ['view']) {
        return await FamilyMember.create({
          familyId: family.id,
          userId,
          role,
          permissions
        });
      },
      
      /**
       * Check if a user is a member of the family
       * @param {string} userId - User ID to check
       * @returns {Promise<boolean>} True if user is a member
       */
      async hasMember(userId) {
        const membership = await FamilyMember.findOne({
          where: {
            familyId: family.id,
            userId
          }
        });
        return !!membership;
      },
      
      /**
       * Get a specific member's role and permissions
       * @param {string} userId - User ID to check
       * @returns {Promise<Object>} Member details or null if not a member
       */
      async getMemberRole(userId) {
        const membership = await FamilyMember.findOne({
          where: {
            familyId: family.id,
            userId
          }
        });
        
        return membership ? {
          role: membership.role,
          permissions: membership.permissions
        } : null;
      },
      
      /**
       * Remove a member from the family
       * @param {string} userId - User ID to remove
       * @returns {Promise<boolean>} True if member was removed
       */
      async removeMember(userId) {
        const result = await FamilyMember.destroy({
          where: {
            familyId: family.id,
            userId
          }
        });
        
        return result > 0;
      },
      
      /**
       * Delete the family and all its member associations
       */
      async delete() {
        await FamilyMember.destroy({
          where: { familyId: family.id }
        });
        
        await Family.destroy({
          where: { id: family.id }
        });
      }
    };
  }

  /**
   * Generate JWT token for testing
   * @param {string} userId - User ID to include in token
   * @param {Object} options - Token options
   * @param {string} options.secret - JWT secret (defaults to test secret)
   * @param {string} options.expiresIn - Token expiration (defaults to 1h)
   * @returns {string} JWT token
   */
  static generateToken(userId, { secret = process.env.JWT_SECRET || 'test-secret-key', expiresIn = '1h' } = {}) {
    return jwt.sign(
      { id: userId },
      secret,
      { expiresIn }
    );
  }

  /**
   * Create request headers with authentication
   * @param {string} userId - User ID to authenticate as
   * @returns {Object} Headers object with Authorization
   */
  static authHeader(userId) {
    const token = this.generateToken(userId);
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Clean up test data
   * @param {Object} options - Cleanup options
   * @param {Array<string>} options.userIds - User IDs to delete
   * @param {Array<string>} options.familyIds - Family IDs to delete
   * @param {boolean} options.force - Force delete (default: true)
   */
  static async cleanup({ userIds = [], familyIds = [], force = true } = {}) {
    // Use a transaction for cleanup to ensure atomicity
    const transaction = await sequelize.transaction();
    
    try {
      // Delete family members first due to foreign key constraints
      if (familyIds.length > 0) {
        await FamilyMember.destroy({
          where: { familyId: familyIds },
          force,
          transaction
        });
        
        await Family.destroy({
          where: { id: familyIds },
          force,
          transaction
        });
      }
      
      // Delete users
      if (userIds.length > 0) {
        await User.destroy({
          where: { id: userIds },
          force,
          transaction
        });
      }
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = FamilyTestHelper;