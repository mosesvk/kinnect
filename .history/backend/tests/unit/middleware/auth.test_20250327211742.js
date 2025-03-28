// tests/unit/controllers/userController.test.js - Fixed version

// Mock the dependencies first
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token')
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

jest.mock('../../../src/models/User', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn()
}));

jest.mock('../../../src/config/db', () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null)
    }))
  }
}));

// Mock other models for user deletion
jest.mock('../../../src/models/FamilyMember', () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  destroy: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../../src/models/Family', () => ({
  findAll: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../src/models/EventAttendee', () => ({
  destroy: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../../src/models/Like', () => ({
  destroy: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../../src/models/Comment', () => ({
  destroy: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../../src/models/Post', () => ({
  findAll: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../src/models/PostFamily', () => ({
  destroy: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../../src/models/PostEvent', () => ({
  destroy: jest.fn().mockResolvedValue(1)
}));

jest.mock('../../../src/models/Media', () => ({
  findAll: jest.fn().mockResolvedValue([])
}));

// Import dependencies after mocks
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../src/models/User');
const { sequelize } = require('../../../src/config/db');
const userController = require('../../../src/controllers/userController');

describe('User Controller Unit Tests', () => {
  // Create a standard response mock
  let res;
  let mockTransaction;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a fresh response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock transaction
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null)
    };
    sequelize.transaction.mockReturnValue(mockTransaction);
  });

  describe('registerUser', () => {
    test('registers a user successfully', async () => {
      // Set up request
      const req = {
        body: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password123'
        }
      };

      // Mock user not existing yet
      User.findOne.mockResolvedValueOnce(null);

      // Mock user creation
      const mockCreatedUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword'
      };

      User.create.mockResolvedValueOnce(mockCreatedUser);

      // Call the controller
      await userController.registerUser(req, res);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });

      expect(User.create).toHaveBeenCalledWith({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'password123'
      });

      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: 'user123',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          token: 'test-token'
        })
      });
    });

    // More tests for registerUser...
  });

  describe('loginUser', () => {
    test('logs in a user successfully', async () => {
      // Set up request
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };

      // Mock user found
      const mockUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        matchPassword: jest.fn().mockResolvedValue(true),
        generateToken: jest.fn().mockReturnValue('test-token')
      };

      User.findOne.mockResolvedValueOnce(mockUser);

      // Call the controller
      await userController.loginUser(req, res);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedpassword'
      );
      
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: 'user123',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          token: 'test-token'
        })
      });
    });

    // More tests for loginUser...
  });

  // More test suites...
});