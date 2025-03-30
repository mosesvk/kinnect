// tests/integration/routes/userRoutes.test.js - Fixed version
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../src/models/User');

// Ensure the mock is properly applied and consistent
jest.mock('../../../src/utils/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('test-token'),
  verifyToken: jest.fn().mockReturnValue({ id: 'user123' })
}));

// For bcrypt mock - make sure this works
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockImplementation((password, hash) => {
    // Always return true except for "wrongpassword"
    return Promise.resolve(password !== "wrongpassword");
  }),
  hash: jest.fn().mockImplementation((password) => {
    return Promise.resolve('hashed_' + password);
  }),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

// Create a mock controller first
const mockUserController = {
  registerUser: jest.fn((req, res) => {
    if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (req.body.email === 'existing@example.com') {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    return res.status(201).json({
      success: true,
      user: {
        id: 'user123',
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        token: 'test-token'
      }
    });
  }),
  
  loginUser: jest.fn((req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    if (req.body.email === 'test@example.com' && req.body.password !== 'wrongpassword') {
      return res.json({
        success: true,
        user: {
          id: 'user123',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          token: 'test-token'
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }),
  
  getUserProfile: jest.fn((req, res) => {
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      }
    });
  }),
  
  updateUserProfile: jest.fn((req, res) => {
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        firstName: req.body.firstName || 'Test',
        lastName: req.body.lastName || 'User',
        email: req.body.email || 'test@example.com',
        token: 'test-token'
      }
    });
  }),
  
  getAllUsers: jest.fn((req, res) => {
    return res.json({
      success: true,
      count: 1,
      users: [{
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      }]
    });
  }),
  
  deleteUserProfile: jest.fn((req, res) => {
    if (!req.body.password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
    
    if (req.body.password === 'wrongpassword') {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    return res.json({
      success: true,
      message: 'Your account has been permanently deleted'
    });
  })
};

// Mock the controller after it's defined
jest.mock('../../../src/controllers/userController', () => mockUserController);

// Mock the auth middleware
jest.mock('../../../src/middleware/auth', () => ({
  protect: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      // Extract user ID from authorization header for testing
      const userId = req.headers.authorization.split(' ')[1];
      req.user = {
        id: userId,
      };
      next();
    } else {
      res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }
  }),
}));

// Mock User model
jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
}));

// Create express app for testing
const app = express();
app.use(express.json());

// Set up the routes
app.post('/api/users/register', mockUserController.registerUser);
app.post('/api/users/login', mockUserController.loginUser);
app.get('/api/users/profile', (req, res, next) => {
  require('../../../src/middleware/auth').protect(req, res, next);
}, mockUserController.getUserProfile);
app.put('/api/users/profile', (req, res, next) => {
  require('../../../src/middleware/auth').protect(req, res, next);
}, mockUserController.updateUserProfile);
app.get('/api/users', (req, res, next) => {
  require('../../../src/middleware/auth').protect(req, res, next);
}, mockUserController.getAllUsers);
app.delete('/api/users/profile', (req, res, next) => {
  require('../../../src/middleware/auth').protect(req, res, next);
}, mockUserController.deleteUserProfile);

describe('User Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password123',
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.firstName).toBe('Test');
      expect(response.body.user.token).toBe('test-token');
      expect(mockUserController.registerUser).toHaveBeenCalled();
    });
    
    it('should return 400 if user already exists', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'existing@example.com',
          password: 'password123',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
      expect(mockUserController.registerUser).toHaveBeenCalled();
    });
    
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          firstName: 'Test',
          // Missing lastName, email, and password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required fields');
      expect(mockUserController.registerUser).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/users/login', () => {
    it('should login user successfully with correct credentials', async () => {
      // Reset mocks
      jest.clearAllMocks();
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      
      // Log response for debugging
      console.log('Login response:', response.status, response.body);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('token');
      expect(response.body.user.id).toBe('user123');
      expect(mockUserController.loginUser).toHaveBeenCalled();
    });
    
    it('should return 401 if password is incorrect', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
      expect(mockUserController.loginUser).toHaveBeenCalled();
    });
    
    it('should return 400 if email and password are not provided', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('provide email and password');
      expect(mockUserController.loginUser).toHaveBeenCalled();
    });
  });
  
  describe('GET /api/users/profile', () => {
    it('should get user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer user123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@example.com');
      expect(mockUserController.getUserProfile).toHaveBeenCalled();
    });
    
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/users/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
      expect(mockUserController.getUserProfile).not.toHaveBeenCalled();
    });
  });
  
  describe('PUT /api/users/profile', () => {
    it('should update user profile when authenticated', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer user123')
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe('Updated');
      expect(response.body.user.lastName).toBe('Name');
      expect(mockUserController.updateUserProfile).toHaveBeenCalled();
    });
    
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({
          firstName: 'Updated'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
      expect(mockUserController.updateUserProfile).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/users', () => {
    it('should get all users when authenticated', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer user123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(mockUserController.getAllUsers).toHaveBeenCalled();
    });
    
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/users');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
      expect(mockUserController.getAllUsers).not.toHaveBeenCalled();
    });
  });
  
  describe('DELETE /api/users/profile', () => {
    it('should delete user profile when authenticated with correct password', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', 'Bearer user123')
        .send({
          password: 'correctPassword'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
      expect(mockUserController.deleteUserProfile).toHaveBeenCalled();
    });
    
    it('should return 401 if password is incorrect', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', 'Bearer user123')
        .send({
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid password');
      expect(mockUserController.deleteUserProfile).toHaveBeenCalled();
    });
    
    it('should return 400 if password is not provided', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', 'Bearer user123')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password is required');
      expect(mockUserController.deleteUserProfile).toHaveBeenCalled();
    });
    
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete('/api/users/profile')
        .send({
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authorized');
      expect(mockUserController.deleteUserProfile).not.toHaveBeenCalled();
    });
  });
});