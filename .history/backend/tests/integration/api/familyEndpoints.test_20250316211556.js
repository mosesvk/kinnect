// tests/integration/api/familyEndpoints.test.js
const request = require('supertest');
const app = require('../../../src/server');
const { sequelize } = require('../../../src/config/db');
const User = require('../../../src/models/User');
const Family = require('../../../src/models/Family');
const FamilyMember = require('../../../src/models/FamilyMember');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

jest.setTimeout(30000); 

describe('Family API Endpoints', () => {
  let testUser;
  let regularUser;
  let adminToken;
  let userToken;
  let testFamily;

  // Generate a JWT token for testing
  const generateToken = (userId) => {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  // Setup before all tests
  beforeAll(async () => {
    try {
      // Connect to test database
      await sequelize.authenticate();
      
      // Use transactions for all test operations to isolate tests
      const transaction = await sequelize.transaction();
      
      try {
        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        testUser = await User.create({
          firstName: 'Test',
          lastName: 'Admin',
          email: 'testadmin@example.com',
          passwordHash: hashedPassword,
          role: 'admin'
        }, { transaction });

        // Create regular user
        const hashedPassword2 = await bcrypt.hash('user123', 10);
        regularUser = await User.create({
          firstName: 'Regular',
          lastName: 'User',
          email: 'regularuser@example.com',
          passwordHash: hashedPassword2,
          role: 'user'
        }, { transaction });

        await transaction.commit();
        
        // Generate tokens
        adminToken = generateToken(testUser.id);
        userToken = generateToken(regularUser.id);
        
        console.log('Test setup completed successfully');
      } catch (error) {
        await transaction.rollback();
        console.error('Test setup failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  // Cleanup after all tests
  afterAll(async () => {
    try {
      // Clean up data created during tests
      await FamilyMember.destroy({
        where: {},
        force: true
      });
      await Family.destroy({
        where: {},
        force: true
      });
      await User.destroy({
        where: {
          id: [testUser.id, regularUser.id]
        },
        force: true
      });
      
      // Close database connection
      await sequelize.close();
      console.log('Test cleanup completed successfully');
    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  });

  describe('POST /api/families', () => {
    it('should create a new family', async () => {
      const response = await request(app)
        .post('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Family',
          description: 'A family for testing API endpoints',
          settings: {
            privacyLevel: 'private',
            notificationPreferences: {
              events: true,
              tasks: true
            }
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.family).toHaveProperty('id');
      expect(response.body.family.name).toBe('Test Family');
      
      // Save family for later tests
      testFamily = response.body.family;
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/families')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name field'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/families')
        .send({
          name: 'Unauthorized Family',
          description: 'Should fail due to no authentication'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/families', () => {
    // First create a family to ensure there's at least one to find
    beforeEach(async () => {
      if (!testFamily) {
        const response = await request(app)
          .post('/api/families')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: 'Test Family for GET',
            description: 'A family for testing GET endpoint'
          });
        
        testFamily = response.body.family;
      }
    });
    
    it('should get all families for the authenticated user', async () => {
      const response = await request(app)
        .get('/api/families')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('families');
      expect(Array.isArray(response.body.families)).toBe(true);
      // Adjust this to check if families contains the test family ID
      expect(response.body.families.some(family => family.id === testFamily.id)).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/families');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/families/:id', () => {
    it('should get a family by ID if user is a member', async () => {
      const response = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.family.id).toBe(testFamily.id);
      expect(response.body.family.name).toBe(testFamily.name);
      expect(response.body).toHaveProperty('userRole');
    });

    it('should return 403 if user is not a member', async () => {
      const response = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if family does not exist', async () => {
      const validUUID = uuidv4();
      const response = await request(app)
        .get(`/api/families/${validUUID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/families/:id', () => {
    it('should update a family if user is an admin', async () => {
      const response = await request(app)
        .put(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Test Family',
          description: 'This description has been updated'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.family.name).toBe('Updated Test Family');
      expect(response.body.family.description).toBe('This description has been updated');
    });

    it('should return 403 if user is not an admin', async () => {
      // Regular user isn't a member yet, so this should fail
      const response = await request(app)
        .put(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Update'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/families/:id/members', () => {
    it('should add a member to the family', async () => {
      const response = await request(app)
        .post(`/api/families/${testFamily.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: regularUser.email,
          role: 'member',
          permissions: ['view']
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(regularUser.id);
      expect(response.body.membership.role).toBe('member');
    });

    it('should return 400 if user is already a member', async () => {
      const response = await request(app)
        .post(`/api/families/${testFamily.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: regularUser.email,
          role: 'member',
          permissions: ['view']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already a member');
    });

    it('should return 404 if user email does not exist', async () => {
      const response = await request(app)
        .post(`/api/families/${testFamily.id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'nonexistent@example.com',
          role: 'member'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/families/:id after adding member', () => {
    it('should allow the new member to access the family', async () => {
      const response = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.family.id).toBe(testFamily.id);
      expect(response.body.userRole).toBe('member');
    });
  });

  describe('DELETE /api/families/:id/members/:userId', () => {
    it('should remove a member from the family', async () => {
      const response = await request(app)
        .delete(`/api/families/${testFamily.id}/members/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed successfully');
    });

    it('should verify the removed member cannot access the family', async () => {
      const response = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if member does not exist', async () => {
      const validUUID = uuidv4();
      const response = await request(app)
        .delete(`/api/families/${testFamily.id}/members/${validUUID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not a member');
    });
  });

  describe('DELETE /api/families/:id', () => {
    it('should delete a family if user is the creator', async () => {
      const response = await request(app)
        .delete(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should verify the family no longer exists', async () => {
      const response = await request(app)
        .get(`/api/families/${testFamily.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if family does not exist', async () => {
      const validUUID = uuidv4();
      const response = await request(app)
        .delete(`/api/families/${validUUID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});