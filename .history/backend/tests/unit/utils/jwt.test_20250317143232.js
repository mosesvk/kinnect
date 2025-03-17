// tests/unit/utils/jwt.test.js

const jwt = require('jsonwebtoken');
const { generateToken } = require('../../../src/utils/jwt');

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('JWT Utility Functions', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Store original environment variables
    this.originalEnv = process.env;
    
    // Set test JWT secret
    process.env.JWT_SECRET = 'test-secret-key';
  });
  
  afterEach(() => {
    // Restore original environment variables
    process.env = this.originalEnv;
  });
  
  describe('generateToken', () => {
    it('should call jwt.sign with correct parameters', () => {
      // Mock jwt.sign to return a token
      jwt.sign.mockReturnValue('mocked-jwt-token');
      
      // Call the function
      const token = generateToken('user123');
      
      // Assert jwt.sign was called correctly
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user123' },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      
      // Assert the token was returned
      expect(token).toBe('mocked-jwt-token');
    });
    
    it('should handle different user IDs', () => {
      // Mock jwt.sign to return a token
      jwt.sign.mockReturnValue('another-mocked-token');
      
      // Call with different user ID
      const token = generateToken('another-user');
      
      // Assert jwt.sign was called with the different user ID
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'another-user' },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      
      // Assert the token was returned
      expect(token).toBe('another-mocked-token');
    });
    
    it('should use environment variable for JWT_SECRET', () => {
      // Set a different JWT secret
      process.env.JWT_SECRET = 'different-secret-key';
      
      // Mock jwt.sign
      jwt.sign.mockReturnValue('token-with-different-secret');
      
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
});