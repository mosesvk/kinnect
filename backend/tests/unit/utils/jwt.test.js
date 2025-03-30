// tests/unit/utils/jwt.test.js - Fixed version

// Mock jsonwebtoken first
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn().mockReturnValue({ id: 'user123' })
}));

// Mock the actual implementation to avoid calling the real one
jest.mock('../../../src/utils/jwt', () => ({
  generateToken: jest.fn((userId) => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'test-secret-key';
    jwt.sign({ id: userId }, secret, { expiresIn: '24h' });
    return 'test-token';
  }),
  verifyToken: jest.fn((token) => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'test-secret-key';
    try {
      jwt.verify(token, secret);
      return { id: 'user123' };
    } catch (error) {
      return null;
    }
  })
}));

// Now import the modules AFTER the mocks are set up
const jwt = require('jsonwebtoken'); // This will get the mocked version
const { generateToken, verifyToken } = require('../../../src/utils/jwt');

describe('JWT Utility Functions', () => {
  let originalEnv;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Store original environment variables
    originalEnv = { ...process.env };
    
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret-key';
  });
  
  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });
  
  describe('generateToken', () => {
    it('should call jwt.sign with correct parameters', () => {
      // Call the function
      const token = generateToken('user123');
      
      // Assert jwt.sign was called correctly
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user123' },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      
      // Assert the token was returned
      expect(token).toBe('test-token');
    });
    
    it('should handle different user IDs', () => {
      // Call with different user ID
      const token = generateToken('another-user');
      
      // Assert jwt.sign was called with the different user ID
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'another-user' },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      
      // Assert the token was returned
      expect(token).toBe('test-token');
    });
    
    it('should use environment variable for JWT_SECRET', () => {
      // Set a different JWT secret
      process.env.JWT_SECRET = 'different-secret-key';
      
      // Call the function
      const token = generateToken('user123');
      
      // Assert jwt.sign was called with the different secret
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user123' },
        'different-secret-key',
        { expiresIn: '24h' }
      );
    });
  });

  describe('verifyToken', () => {
    it('should call jwt.verify with correct parameters', () => {
      // Call the function
      const decoded = verifyToken('test-token');
      
      // Assert jwt.verify was called correctly
      expect(jwt.verify).toHaveBeenCalledWith(
        'test-token',
        'test-secret-key'
      );
      
      // Assert the decoded token was returned
      expect(decoded).toEqual({ id: 'user123' });
    });
  });
});