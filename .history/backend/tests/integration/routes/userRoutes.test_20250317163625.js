// tests/integration/routes/userRoutes.test.js (beginning of file)
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

// Mock jsonwebtoken and utils/jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn()
}));

jest.mock('../../../src/utils/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('test-token')
}));

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);