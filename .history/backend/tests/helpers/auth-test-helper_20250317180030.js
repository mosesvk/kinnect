// File: tests/helpers/auth-test-setup.js

/**
 * This helper provides consistent mocking for authentication in tests
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Static test token
const TEST_TOKEN = 'test-token';
const TEST_USER_ID = 'test-user-id';

/**
 * Set up authentication mocks for a test file
 */
const setupAuthMocks = () => {
  // Mock JWT
  jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue(TEST_TOKEN),
    verify: jest.fn().mockImplementation(() => ({ id: TEST_USER_ID }))
  }));
  
  // Mock bcrypt
  jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockReturnValue('hashed_password'),
    genSalt: jest.fn().mockResolvedValue('salt')
  }));
  
  // Create test user object
  const testUser = {
    id: TEST_USER_ID,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    role: 'user',
    matchPassword: jest.fn().mockResolvedValue(true),
    generateToken: jest.fn().mockReturnValue(TEST_TOKEN)
  };
  
  return {
    testUser,
    testToken: TEST_TOKEN
  };
};

/**
 * Create auth headers for requests
 */
const getAuthHeaders = () => ({
  Authorization: `Bearer ${TEST_TOKEN}`
});

/**
 * Mock the protect middleware for Express router tests
 */
const mockProtectMiddleware = (req, res, next) => {
  req.user = {
    id: TEST_USER_ID,
    role: 'user'
  };
  next();
};

/**
 * Mock the admin middleware for Express router tests
 */
const mockAdminMiddleware = (req, res, next) => {
  req.user = {
    id: TEST_USER_ID,
    role: 'admin'
  };
  next();
};

module.exports = {
  setupAuthMocks,
  getAuthHeaders,
  mockProtectMiddleware,
  mockAdminMiddleware,
  TEST_TOKEN,
  TEST_USER_ID
};

// File: tests/setup-test-env.js
// This file can be referenced in your jest.config.js as setupFilesAfterEnv

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Set JWT_SECRET for testing
process.env.JWT_SECRET = 'test-secret-key';

// Additional test environment setup can go here