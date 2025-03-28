// tests/unit/utils/jwt.test.js - Fixed version

const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../../../src/utils/jwt');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-token'),
  verify: jest.fn().mockReturnValue({ id: 'user123' })
}));

// Now require the module which uses the mocked dependencies
const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../../../src/utils/jwt');


describe('JWT Utility Functions', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Store original environment variables
    this.originalEnv = { ...process.env };
    
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret-key';
  });
  
  afterEach(() => {
    // Restore original environment variables
    process.env = this.originalEnv;
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