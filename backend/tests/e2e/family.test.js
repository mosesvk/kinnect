// tests/e2e/family.test.js
const request = require('supertest');
const app = require('../../src/app'); // You'll need to export the app from a separate file
const { sequelize } = require('../../src/config/db');
const { User, Family, FamilyMember } = require('../../src/models/Index');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Family API E2E Tests
 * 
 * These tests verify the entire flow of family-related operations
 * from creating a family to managing members and deleting it.
 */

describe('Family API End-to-End Tests', () => {
  // Test data
  let admin;
  let regularUser;
  let adminToken;
  let userToken;
  let testFamily;
  
  // Helper function to generate tokens
  const generateToken = (userId) => {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  };

  // Setup before all tests
  beforeAll(async () => {
    try {
      // Connect to test database
      await sequelize.authenticate();
      
      // Sync models with force: true to start with clean tables
      await sequelize.sync({ force: true });
      
      console.log('Connected to test database and reset tables');
    } catch (error) {
      console.error('Database setup failed:', error);
      throw error;
    }
  });

  // Teardown after all tests
  afterAll(async () => {
    try {
      // Close database connection
      await sequelize.close();
      console.log('Test database connection closed');
    } catch (error) {
      console.error('Database teardown failed:', error);
    }
  });

  // Setup before each test
  beforeEach(async () => {
    try {
      // Clean up existing data
      await FamilyMember.destroy({ where: {} });
      await Family.destroy({ where: {} });
      await User.destroy({ where: {} });
      
      // Create admin user
      const hashedPassword1 = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        passwordHash: hashedPassword1,
        role: 'admin'
      });
      
      // Create regular user
      const hashedPassword2 = await bcrypt.hash('user123', 10);
      regularUser = await User.create({
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@example.com',
        passwordHash: hashedPassword2,
        role: 'user'
      });
      
      // Generate tokens
      adminToken = generateToken(admin.id);
      userToken = generateToken(regularUser.id);
      
    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  // E2E Test Flow
  describe('Complete Family Management Flow', () => {
    it('should handle the entire family lifecycle', async () => {
      // Step 1: Create a new family
      console.log('Step 1: Creating a new family');
      const createResponse = await request(app)
        .post('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Family',
          description: 'Family created during E2E testing',
          settings: { privacyLevel: 'private' }
        });
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.family).toHaveProperty('id');
      
      testFamily = createResponse.body.family;
      console.log(`Family created with ID: ${testFamily.id}`);
      
      // Step 2: Get family details
      console.log('Step 2: Retrieving family details');
      const getResponse = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.family.name).toBe('E2E Test Family');
      expect(getResponse.body.userRole).toBe('admin');
      
      // Step 3: Update family details
      console.log('Step 3: Updating family details');
      const updateResponse = await request(app)
        .put(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated E2E Family',
          description: 'This description has been updated'
        });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.family.name).toBe('Updated E2E Family');
      
      // Step 4: Add a new member to the family
      console.log('Step 4: Adding a new member to the family');
      const addMemberResponse = await request(app)
        .post(`/api/families/${testFamily.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: regularUser.email,
          role: 'member',
          permissions: ['view']
        });
      
      expect(addMemberResponse.status).toBe(201);
      expect(addMemberResponse.body.success).toBe(true);
      expect(addMemberResponse.body.user.id).toBe(regularUser.id);
      
      // Step 5: Verify the regular user can access the family
      console.log('Step 5: Verifying new member can access the family');
      const memberAccessResponse = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(memberAccessResponse.status).toBe(200);
      expect(memberAccessResponse.body.success).toBe(true);
      expect(memberAccessResponse.body.userRole).toBe('member');
      
      // Step 6: Verify the regular user cannot update the family
      console.log('Step 6: Verifying member cannot update the family');
      const unauthorizedUpdateResponse = await request(app)
        .put(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Update'
        });
      
      expect(unauthorizedUpdateResponse.status).toBe(403);
      expect(unauthorizedUpdateResponse.body.success).toBe(false);
      
      // Step 7: Remove the regular user from the family
      console.log('Step 7: Removing member from the family');
      const removeMemberResponse = await request(app)
        .delete(`/api/families/${testFamily.id}/members/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(removeMemberResponse.status).toBe(200);
      expect(removeMemberResponse.body.success).toBe(true);
      
      // Step 8: Verify the removed user can no longer access the family
      console.log('Step 8: Verifying removed member cannot access the family');
      const noAccessResponse = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(noAccessResponse.status).toBe(403);
      expect(noAccessResponse.body.success).toBe(false);
      
      // Step 9: Delete the family
      console.log('Step 9: Deleting the family');
      const deleteResponse = await request(app)
        .delete(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      
      // Step 10: Verify the family no longer exists
      console.log('Step 10: Verifying family no longer exists');
      const notFoundResponse = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(notFoundResponse.status).toBe(404);
      expect(notFoundResponse.body.success).toBe(false);
      
      console.log('End-to-end family test completed successfully');
    });
  });

  // Additional test for error handling
  describe('Error Handling', () => {
    it('should handle invalid family ID', async () => {
      const response = await request(app)
        .get('/api/families/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
    
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/families');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});