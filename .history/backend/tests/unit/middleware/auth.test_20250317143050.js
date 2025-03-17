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
      expect(jwt.verify).toHaveBeenCalledWith('validtoken', process.env.JWT_SECRET);
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
      // Note: Your implementation might handle this differently - adjust test as needed
      expect(res.status).toHaveBeenCalledWith(401);
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
  });
});
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