// tests/integration/routes/userRoutes.test.js
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../src/models/User');
const userRoutes = require('../../../src/routes/userRoutes');
const { protect } = require('../../../src/middleware/auth');

// Ensure the mock is properly applied
jest.mock('../../../src/utils/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('test-token')
}));

// For bcrypt mock
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true), // This should return true for the test
  hash: jest.fn().mockReturnValue('hashed_password'),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

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
  });
  
  describe('POST /api/users/login', () => {
    it('should login user successfully with correct credentials', async () => {
      // Reset and set up the mock again just for this test
      bcrypt.compare.mockReset();
      bcrypt.compare.mockResolvedValue(true);
      
      // Mock user found with proper matchPassword and generateToken methods
      const mockUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        matchPassword: jest.fn().mockResolvedValue(true), // Make sure this returns true
        generateToken: jest.fn().mockReturnValue('test-token')
      };
      
      User.findOne.mockResolvedValue(mockUser);
      
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
  });
});