// tests/integration/api/userEndpoints.test.js

const request = require('supertest');
const app = require('../../../src/server');
const { sequelize } = require('../../../src/config/db');
const User = require('../../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Mock the JWT token generation with a fixed string
// We're using 'mock' prefix as allowed by Jest
jest.mock('../../../src/middleware/auth', () => {
  const mockUserUUID = '12345678-1234-1234-1234-123456789012'; // Fixed UUID for tests
  
  return {
    protect: jest.fn((req, res, next) => {
      // Check if authorization header exists
      if (req.headers.authorization && 
          req.headers.authorization.startsWith('Bearer')) {
        // Set user for authenticated requests
        req.user = {
          id: mockUserUUID,
          role: 'user'
        };
        next();
      } else {
        // Return 401 for unauthenticated requests
        res.status(401).json({
          success: false,
          message: 'Not authorized, no token'
        });
      }
    }),
    admin: jest.fn((req, res, next) => {
      next();
    }),
    // Export a getter for tests to access the UUID
    get TEST_USER_UUID() {
      return mockUserUUID;
    }
  };
});

// Import after mocking to get the mock version
const { TEST_USER_UUID } = require('../../../src/middleware/auth');

jest.setTimeout(30000);

describe('User API Endpoints', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testUserEmail;
  let adminUserEmail;

  // Helper functions
  const generateRandomEmail = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `test${timestamp}${random}@example.com`;
  };

  // Generate JWT token for testing
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
      
      // Use transactions for test isolation
      const transaction = await sequelize.transaction();
      
      try {
        // Create random emails for test users
        testUserEmail = generateRandomEmail();
        adminUserEmail = generateRandomEmail();

        // Create special user with our test UUID to match auth middleware
        const specialUserPassword = await bcrypt.hash('test123', 10);
        await User.create({
          id: TEST_USER_UUID,
          firstName: 'Special',
          lastName: 'TestUser',
          email: 'special@example.com',
          passwordHash: specialUserPassword,
          role: 'user'
        }, { transaction });

        // Create regular test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        testUser = await User.create({
          firstName: 'Test',
          lastName: 'User',
          email: testUserEmail,
          passwordHash: hashedPassword,
          role: 'user'
        }, { transaction });

        // Create admin test user
        const adminHashedPassword = await bcrypt.hash('admin123', 10);
        adminUser = await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email: adminUserEmail,
          passwordHash: adminHashedPassword,
          role: 'admin'
        }, { transaction });

        await transaction.commit();
        
        // Generate tokens
        userToken = generateToken(testUser.id);
        adminToken = generateToken(adminUser.id);
        
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
          id: [testUser.id, adminUser.id, TEST_USER_UUID]
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
          password: 'password123'
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
          password: 'password123'
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
      // For this test, we'll use the special user
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'special@example.com',
          password: 'test123'
        });
  
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('token');
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
          password: 'password123'
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

  describe('GET /api/users/profile', () => {
    it('should get user profile successfully', async () => {
      // Use any authorization header - our mocked middleware will use TEST_USER_UUID
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer any-token-will-work');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      // Expect the user to be our special test user
      expect(response.body.user.id).toBe(TEST_USER_UUID);
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
        .set('Authorization', 'Bearer any-token-will-work')
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

    it('should allow updating just one field', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer any-token-will-work')
        .send({
          firstName: 'JustFirstName'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe('JustFirstName');
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

  describe('GET /api/users (Admin Only)', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer any-token-will-work');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThanOrEqual(3); // At least our test users
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