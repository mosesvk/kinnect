// tests/integration/api/userEndpoints.test.js

const request = require('supertest');
const app = require('../../../src/server');
const { sequelize } = require('../../../src/config/db');
const User = require('../../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.setTimeout(30000);

describe('User API Endpoints', () => {
  let testUser;
  let adminUser;
  let testUserEmail;
  let adminUserEmail;
  let plainPassword = 'testpass123';  // Use a known password

  // Helper functions
  const generateRandomEmail = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `test${timestamp}${random}@example.com`;
  };

  // Setup before all tests
  beforeAll(async () => {
    try {
      // Connect to test database
      await sequelize.authenticate();
      
      // Use transactions for test isolation
      const transaction = await sequelize.transaction();
      
      try {
        // Create random emails for test users
        testUserEmail = generateRandomEmail();
        adminUserEmail = generateRandomEmail();

        // Create regular test user with known password
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        testUser = await User.create({
          firstName: 'Test',
          lastName: 'User',
          email: testUserEmail,
          passwordHash: hashedPassword,
          role: 'user'
        }, { transaction });

        // Create admin test user with same password for simplicity
        adminUser = await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email: adminUserEmail,
          passwordHash: hashedPassword,
          role: 'admin'
        }, { transaction });

        await transaction.commit();
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
      // Clean up test users
      await User.destroy({
        where: {
          id: [testUser.id, adminUser.id]
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

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: generateRandomEmail(),
          password: plainPassword
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('token');
      expect(response.body.user.firstName).toBe('New');
      expect(response.body.user.lastName).toBe('User');
    });

    it('should return 400 if email already exists', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Duplicate',
          lastName: 'User',
          email: testUserEmail, // Use existing email
          password: plainPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Incomplete',
          // Missing lastName, email, and password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required fields');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUserEmail,
          password: plainPassword
        });
  
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUserEmail);
    });

    it('should return 401 with incorrect password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUserEmail,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: plainPassword
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          // Missing both email and password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('provide email and password');
    });
  });

  describe('Protected Endpoints', () => {
    let authToken;

    // Before running protected endpoint tests, get a valid auth token
    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: testUserEmail,
          password: plainPassword
        });
        
      authToken = loginResponse.body.user.token;
    });
    
    describe('GET /api/users/profile', () => {
      it('should get user profile successfully', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`);
  
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.email).toBe(testUserEmail);
      });
  
      it('should return 401 if no token provided', async () => {
        const response = await request(app)
          .get('/api/users/profile');
  
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Not authorized');
      });
    });
  
    describe('PUT /api/users/profile', () => {
      it('should update user profile successfully', async () => {
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'Updated',
            lastName: 'TestUser'
          });
  
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user.firstName).toBe('Updated');
        expect(response.body.user.lastName).toBe('TestUser');
        expect(response.body.user).toHaveProperty('token');
      });
  
      it('should return 401 if no token provided', async () => {
        const response = await request(app)
          .put('/api/users/profile')
          .send({
            firstName: 'Unauthorized'
          });
  
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Not authorized');
      });
    });
  });

  describe('Admin Endpoints', () => {
    let adminToken;

    // Before running admin endpoint tests, get a valid admin token
    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/users/login')
        .send({
          email: adminUserEmail,
          password: plainPassword
        });
        
      adminToken = loginResponse.body.user.token;
    });
    
    describe('GET /api/users', () => {
      it('should get all users if admin', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`);
  
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('users');
        expect(Array.isArray(response.body.users)).toBe(true);
        expect(response.body.users.length).toBeGreaterThanOrEqual(2);
      });
  
      it('should return 401 if no token provided', async () => {
        const response = await request(app)
          .get('/api/users');
  
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Not authorized');
      });
    });
  });
});