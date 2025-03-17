// tests/unit/middleware/auth.test.js

const jwt = require('jsonwebtoken');
const User = require('../../../src/models/User');
const { protect, admin } = require('../../../src/middleware/auth');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../../src/models/User');

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;
  let originalProcessEnv;

  beforeAll(() => {
    // Store original process.env
    originalProcessEnv = process.env;
    
    // Set JWT_SECRET for testing
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterAll(() => {
    // Restore original process.env
    process.env = originalProcessEnv;
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup request, response, and next function mocks
    req = {
      headers: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Set console methods to avoid polluting test output
    console.error = jest.fn();
  });

  describe('protect middleware', () => {
    it('should call next() if valid token is provided', async () => {
      // Mock request with valid token
      req.headers.authorization = 'Bearer validtoken';
      
      // Mock JWT verify to return decoded token
      jwt.verify.mockReturnValue({ id: 'user123' });
      
      // Mock findByPk to return a user
      const mockUser = { id: 'user123', firstName: 'Test' };
      User.findByPk.mockResolvedValue(mockUser);
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert that next was called
      expect(jwt.verify).toHaveBeenCalledWith('validtoken', 'test-secret-key');
      expect(User.findByPk).toHaveBeenCalledWith('user123', {
        attributes: { exclude: ['passwordHash'] }
      });
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
      // No authorization header
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert 401 response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, no token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      // Mock request with invalid token
      req.headers.authorization = 'Bearer invalidtoken';
      
      // Mock JWT verify to throw error
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert 401 response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(next).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it('should return 401 if user is not found', async () => {
      // Mock request with valid token but no user
      req.headers.authorization = 'Bearer validtoken';
      
      // Mock JWT verify to return decoded token
      jwt.verify.mockReturnValue({ id: 'nonexistent' });
      
      // Mock findByPk to return null (user not found)
      User.findByPk.mockResolvedValue(null);
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert 401 response due to user not found
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed Bearer token', async () => {
      // Mock request with malformed token
      req.headers.authorization = 'Invalidformat';
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert 401 response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, no token'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle token with wrong format', async () => {
      // Mock request with token in wrong format
      req.headers.authorization = 'Bearer ';
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert 401 response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, no token'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle expired token', async () => {
      // Mock request with expired token
      req.headers.authorization = 'Bearer expiredtoken';
      
      // Mock JWT verify to throw TokenExpiredError
      const tokenExpiredError = new Error('jwt expired');
      tokenExpiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw tokenExpiredError;
      });
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert 401 response
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Auth middleware error:',
        expect.objectContaining({ name: 'TokenExpiredError' })
      );
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle database error when finding user', async () => {
      // Mock request with valid token
      req.headers.authorization = 'Bearer validtoken';
      
      // Mock JWT verify to return decoded token
      jwt.verify.mockReturnValue({ id: 'user123' });
      
      // Mock findByPk to throw error
      const dbError = new Error('Database connection error');
      User.findByPk.mockRejectedValue(dbError);
      
      // Call middleware
      await protect(req, res, next);
      
      // Assert 401 response due to database error
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(console.error).toHaveBeenCalledWith(
        'Auth middleware error:',
        expect.any(Error)
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('admin middleware', () => {
    it('should call next() if user is an admin', () => {
      // Set user with admin role (typically set by protect middleware)
      req.user = { id: 'admin123', role: 'admin' };
      
      // Call middleware
      admin(req, res, next);
      
      // Assert next was called
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if user is not an admin', () => {
      // Set user with non-admin role
      req.user = { id: 'user123', role: 'user' };
      
      // Call middleware
      admin(req, res, next);
      
      // Assert 403 response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized as an admin'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if no user object exists', () => {
      // No user object set
      
      // Call middleware
      admin(req, res, next);
      
      // Assert 403 response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized as an admin'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 if user object exists but role property is missing', () => {
      // Set user without role property
      req.user = { id: 'user123' };
      
      // Call middleware
      admin(req, res, next);
      
      // Assert 403 response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized as an admin'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should return 403 if user has a role other than "admin"', () => {
      // Test with various non-admin roles
      const nonAdminRoles = ['user', 'member', 'moderator', 'editor', ''];
      
      for (const role of nonAdminRoles) {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        
        // Set user with non-admin role
        req.user = { id: 'user123', role };
        
        // Call middleware
        admin(req, res, next);
        
        // Assert 403 response
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized as an admin'
        });
        expect(next).not.toHaveBeenCalled();
      }
    });
  });
});a