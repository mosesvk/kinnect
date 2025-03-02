// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models/Index');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['passwordHash'] }
      });

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Admin middleware
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Not authorized as an admin'
    });
  }
};

// Check family permissions middleware
exports.checkFamilyPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const familyId = req.params.id;
      const { FamilyMember } = require('../models/Family');
      
      // Find the user's membership in this family
      const membership = await FamilyMember.findOne({
        where: {
          familyId,
          userId: req.user.id
        }
      });

      // Check if user is a member and has the required permission
      if (!membership || !membership.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Not authorized to ${permission} in this family`
        });
      }

      // Add membership info to request object for controllers
      req.familyRole = membership.role;
      req.familyPermissions = membership.permissions;
      
      next();
    } catch (error) {
      console.error('Family permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };
};