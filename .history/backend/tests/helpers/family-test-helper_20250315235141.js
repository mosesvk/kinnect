// tests/helpers/family-test-helper.js

/**
 * Helper functions for family tests
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const Family = require('../../src/models/Family');
const FamilyMember = require('../../src/models/FamilyMember');

/**
 * Create test users for testing
 * @param {number} count Number of test users to create
 * @returns {Promise<Array>} Array of created users
 */
const createTestUsers = async (count = 2) => {
  const users = [];
  const hashedPassword = await bcrypt.hash('password123', 10);

  for (let i = 0; i < count; i++) {
    const user = await User.create({
      firstName: `Test${i}`,
      lastName: `User${i}`,
      email: `test${i}@example.com`,
      passwordHash: hashedPassword,
      role: i === 0 ? 'admin' : 'user'
    });
    
    users.push(user);
  }

  return users;
};

/**
 * Create a test family with members
 * @param {string} creatorId User ID of the family creator
 * @param {Array} memberIds Array of user IDs to add as members
 * @param {Object} familyData Custom family data
 * @returns {Promise<Object>} Created family with members
 */
const createTestFamily = async (creatorId, memberIds = [], familyData = {}) => {
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

  return {
    family,
    async getMembers() {
      return await FamilyMember.findAll({
        where: { familyId: family.id }
      });
    }
  };
};

/**
 * Generate JWT token for a user
 * @param {string} userId User ID to include in token
 * @returns {string} JWT token
 */
const generateUserToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'testsecret',
    { expiresIn: '1h' }
  );
};

/**
 * Create request headers with authentication
 * @param {string} userId User ID to authenticate as
 * @returns {Object} Headers object with Authorization
 */
const authHeader = (userId) => {
  const token = generateUserToken(userId);
  return { Authorization: `Bearer ${token}` };
};

/**
 * Clean up test data
 * @param {Array} userIds User IDs to delete
 * @param {Array} familyIds Family IDs to delete
 */
const cleanupTestData = async (userIds = [], familyIds = []) => {
  // Delete family members first due to foreign key constraints
  if (familyIds.length > 0) {
    await FamilyMember.destroy({
      where: { familyId: familyIds }
    });
    
    await Family.destroy({
      where: { id: familyIds }
    });
  }
  
  if (userIds.length > 0) {
    await User.destroy({
      where: { id: userIds }
    });
  }
};

module.exports = {
  createTestUsers,
  createTestFamily,
  generateUserToken,
  authHeader,
  cleanupTestData
};