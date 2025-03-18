// tests/integration/api/userEndpoints.test.js

const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

// Create mock test data
const mockUserUUID = '12345678-1234-1234-1234-123456789012';
const mockUser = {
  id: mockUserUUID,
  firstName: 'Special',
  lastName: 'TestUser',
  email: 'special@example.com',
  passwordHash: 'hashedPassword',
  role: 'user'
};

// Mock the User model before importing controllers
jest.mock('../../../src/models/User', () => {
  return {
    findOne: jest.fn().mockImplementation((options) => {
      if (options && options.where && options.where.email === 'special@example.com') {
        return Promise.resolve({
          ...mockUser,
          matchPassword: jest.fn().mockResolvedValue(true),
          generateToken: jest.fn().mockReturnValue('test-token')
        });
      } else if (options && options.where && options.where.email) {
        // Return null for other emails except for test emails
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === mockUserUUID) {
        return Promise.resolve({
          ...mockUser,
          save: jest.fn().mockImplementation(function() {
            // Update the mock user object with the new values
            Object.assign(this, { ...this });
            return Promise.resolve(this);
          }),
          toJSON: jest.fn().mockReturnValue(mockUser)
        });
      }
      return Promise.resolve(null);
    }),
    findAll: jest.fn().mockResolvedValue([mockUser]),
    create: jest.fn().mockImplementation((userData) => {
      const newUser = {
        id: uuidv4(),
        ...userData,
        toJSON: () => ({ id: uuidv4(), ...userData })
      };
      return Promise.resolve(newUser);
    })
  };
});

// Mock bcrypt for password verification
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

// Mock jwt for token generation
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn().mockReturnValue({ id: mockUserUUID })
}));

// Mock the auth middleware
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => {
    if (req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')) {
      req.user = {
        id: mockUserUUID,
        role: 'user'
      };
      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
  }),
  admin: jest.fn((req, res, next) => {
    next();
  })
}));

// Import Express app
const app = require('../../../src/server');

// Mock sequelize
jest.mock('../../../src/config/db', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(),
    transaction: jest.fn().mockImplementation(() => ({
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue()
    })),
    close: jest.fn().mockResolvedValue()
  },
  connectDB: jest.fn().mockResolvedValue()
}));

jest.setTimeout(30000);

describe('User API Endpoints', () => {
  beforeAll(() => {
    console.log('Test setup completed successfully');
  });

  afterAll(() => {
    console.log('Test cleanup completed successfully');
  });

  describe('POST /api/users/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'newuser@example.com',
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
      // Mock User.findOne to return a user for this specific test
      const originalFindOne = require('../../../src/models/User').findOne;
      require('../../../src/models/User').findOne.mockImplementationOnce((options) => {
        if (options && options.where && options.where.email === 'existing@example.com') {
          return Promise.resolve({ id: 'existing-id', email: 'existing@example.com' });
        }
        return originalFindOne(options);
      });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Duplicate',
          lastName: 'User',
          email: 'existing@example.com',
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
          firstName: 'Incomplete'
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
          email: 'special@example.com',
          password: 'test123'
        });
  
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('token');
    });

    it('should return 401 with incorrect password', async () => {
      // Override the bcrypt compare for this specific test
      require('bcryptjs').compare.mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'special@example.com',
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
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer any-token-will-work');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.id).toBe(mockUserUUID);
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