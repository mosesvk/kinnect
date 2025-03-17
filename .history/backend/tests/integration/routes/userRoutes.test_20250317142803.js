// tests/integration/routes/userRoutes.test.js

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../src/models/User');
const userRoutes = require('../../../src/routes/userRoutes');
const { protect } = require('../../../src/middleware/auth');

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

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn()
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn()
}));

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users (Register)', () => {
    it('should register a new user successfully', async () => {
      // Mock user not existing yet
      User.findOne.mockResolvedValue(null);
      
      // Mock user creation
      const createdUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      };
      User.create.mockResolvedValue(createdUser);
      
      const response = await request(app)
        .post('/api/users')
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
    });
    
    it('should return 400 if user already exists', async () => {
      // Mock user already exists
      User.findOne.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });
      
      const response = await request(app)
        .post('/api/users')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'existing@example.com',
          password: 'password123',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already exists');
    });
    
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          firstName: 'Test',
          // Missing lastName, email, password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide all required fields');
    });
  });
  
  describe('POST /api/users/login', () => {
    it('should login user successfully with correct credentials', async () => {
      // Mock user found
      const mockUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      };
      User.findOne.mockResolvedValue(mockUser);
      
      // Mock password match
      bcrypt.compare.mockResolvedValue(true);
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('token');
      expect(response.body.user.id).toBe('user123');
    });
    
    it('should return 401 if password is incorrect', async () => {
      // Mock user found
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
      };
      User.findOne.mockResolvedValue(mockUser);
      
      // Mock password doesn't match
      bcrypt.compare.mockResolvedValue(false);
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrong_password',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });
    
    it('should return 401 if user does not exist', async () => {
      // Mock user not found
      User.findOne.mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });
    
    it('should return 400 if credentials are missing', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          // Missing email and password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please provide email and password');
    });
  });
  
  describe('GET /api/users/profile', () => {
    it('should get user profile successfully', async () => {
      // Mock user found
      const mockUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'user',
      };
      User.findByPk.mockResolvedValue(mockUser);
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer user123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe('user123');
      expect(response.body.user.firstName).toBe('Test');
    });
    
    it('should return 404 if user not found', async () => {
      // Mock user not found
      User.findByPk.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
    
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/users/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not authorized, no token');
    });
  });
  
  describe('PUT /api/users/profile', () => {
    it('should update user profile successfully', async () => {
      // Mock finding the user
      const mockUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'old_hash',
        save: jest.fn().mockResolvedValue({
          id: 'user123',
          firstName: 'Updated',
          lastName: 'User',
          email: 'test@example.com',
        }),
      };
      User.findByPk.mockResolvedValue(mockUser);
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer user123')
        .send({
          firstName: 'Updated',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockUser.firstName).toBe('Updated');
      expect(mockUser.save).toHaveBeenCalled();
      expect(response.body.user.token).toBe('test-token');
    });
    
    it('should update password if provided', async () => {
      // Mock finding the user
      const mockUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'old_hash',
        save: jest.fn().mockResolvedValue({
          id: 'user123',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        }),
      };
      User.findByPk.mockResolvedValue(mockUser);
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer user123')
        .send({
          password: 'new_password',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockUser.passwordHash).toBe('new_password');
      expect(mockUser.save).toHaveBeenCalled();
    });
    
    it('should return 404 if user not found', async () => {
      // Mock user not found
      User.findByPk.mockResolvedValue(null);
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer nonexistent')
        .send({
          firstName: 'Updated',
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });
  
  describe('GET /api/users (Get all users)', () => {
    it('should get all users successfully', async () => {
      // Mock users found
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'User1',
          lastName: 'Test',
          email: 'user1@example.com',
        },
        {
          id: 'user2',
          firstName: 'User2',
          lastName: 'Test',
          email: 'user2@example.com',
        },
      ];
      User.findAll.mockResolvedValue(mockUsers);
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer admin123');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });
    
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/users');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});