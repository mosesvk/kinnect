// First, we need to mock all the models and dependencies before requiring the controller
// This ensures our mocks are in place before any module tries to use them

// Mock Sequelize
jest.mock('sequelize', () => {
  const mSequelize = {
    define: jest.fn(() => mSequelize.Model),
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    Model: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
      count: jest.fn(),
    },
    QueryTypes: {
      SELECT: 'SELECT',
    },
  };
  return jest.fn(() => mSequelize);
});

// Mock the database config
jest.mock('../../../src/config/db', () => {
  return {
    sequelize: {
      define: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        destroy: jest.fn(),
        count: jest.fn(),
      }),
      authenticate: jest.fn().mockResolvedValue(),
      query: jest.fn(),
      QueryTypes: {
        SELECT: 'SELECT',
      },
    },
    connectDB: jest.fn().mockResolvedValue(),
  };
});

// Mock the models
jest.mock('../../../src/models/User', () => {
  return {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  };
});

jest.mock('../../../src/models/Family', () => {
  return {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  };
});

jest.mock('../../../src/models/FamilyMember', () => {
  return {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
  };
});

// Now we can import the controller and models
const User = require('../../../src/models/User');
const Family = require('../../../src/models/Family');
const FamilyMember = require('../../../src/models/FamilyMember');
const { sequelize } = require('../../../src/config/db');
// Finally, import the controller
const familyController = require('../../../src/controllers/familyController');

describe('Family Controller Tests', () => {
  // Setup for each test
  let req, res;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });
  
  describe('createFamily', () => {
    beforeEach(() => {
      req = {
        body: {
          name: 'Test Family',
          description: 'A test family',
        },
        user: { id: 'user-123' },
      };
    });
    
    test('should create a family successfully', async () => {
      // Setup mocks
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        description: 'A test family',
      };
      
      Family.create.mockResolvedValue(mockFamily);
      FamilyMember.create.mockResolvedValue({ id: 'member-123' });
      
      // Call controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(Family.create).toHaveBeenCalledWith({
        name: 'Test Family',
        description: 'A test family',
        createdBy: 'user-123',
      });
      
      expect(FamilyMember.create).toHaveBeenCalledWith({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
        permissions: ['view', 'edit', 'delete', 'invite'],
      });
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
      });
    });
    
    test('should return 400 if name is missing', async () => {
      // Setup request with missing name
      req.body = { description: 'Missing name' };
      
      // Call controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please provide a family name',
      });
      expect(Family.create).not.toHaveBeenCalled();
    });
    
    test('should handle server errors', async () => {
      // Setup mock error
      Family.create.mockRejectedValue(new Error('Database error'));
      
      // Call controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
        error: 'Database error',
      });
    });
  });
  
  describe('getFamilyById', () => {
    beforeEach(() => {
      req = {
        params: { id: 'family-123' },
        user: { id: 'user-123' },
      };
    });
    
    test('should return a family when user is a member', async () => {
      // Setup mocks
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
      };
      
      const mockMembership = {
        role: 'admin',
        permissions: ['view', 'edit'],
      };
      
      Family.findByPk.mockResolvedValue(mockFamily);
      FamilyMember.findOne.mockResolvedValue(mockMembership);
      
      // Call controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(Family.findByPk).toHaveBeenCalled();
      expect(FamilyMember.findOne).toHaveBeenCalledWith({
        where: {
          familyId: 'family-123',
          userId: 'user-123',
        }
      });
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
        userRole: 'admin',
        userPermissions: ['view', 'edit'],
      });
    });
    
    test('should return 404 if family not found', async () => {
      // Setup mock to return null (no family found)
      Family.findByPk.mockResolvedValue(null);
      
      // Call controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Family not found',
      });
    });
    
    test('should return 403 if user is not a member', async () => {
      // Setup mocks
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
      };
      
      Family.findByPk.mockResolvedValue(mockFamily);
      FamilyMember.findOne.mockResolvedValue(null); // No membership found
      
      // Call controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this family',
      });
    });
    
    test('should handle server errors', async () => {
      // Setup mock error
      Family.findByPk.mockRejectedValue(new Error('Database error'));
      
      // Call controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
        error: 'Database error',
      });
    });
  });
  
  describe('getUserFamilies', () => {
    beforeEach(() => {
      req = {
        user: { id: 'user-123' },
      };
    });
    
    test('should return all families for the user', async () => {
      // Setup mock
      const mockFamilies = [
        {
          id: 'family-123',
          name: 'Test Family 1',
        },
        {
          id: 'family-456',
          name: 'Test Family 2',
        },
      ];
      
      sequelize.query.mockResolvedValue([mockFamilies]);
      
      // Call controller
      await familyController.getUserFamilies(req, res);
      
      // Assertions
      expect(sequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        families: mockFamilies,
      });
    });
    
    test('should handle empty results', async () => {
      // Setup mock
      sequelize.query.mockResolvedValue([[]]);
      
      // Call controller
      await familyController.getUserFamilies(req, res);
      
      // Assertions
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        families: [],
      });
    });
    
    test('should handle server errors', async () => {
      // Setup mock error
      sequelize.query.mockRejectedValue(new Error('Database error'));
      
      // Call controller
      await familyController.getUserFamilies(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
        error: 'Database error',
      });
    });
  });
  
  describe('removeFamilyMember', () => {
    beforeEach(() => {
      req = {
        params: {
          id: 'family-123',
          userId: 'user-456',
        },
        user: { id: 'user-123' },
      };
    });
    
    test('should remove a member from the family', async () => {
      // Setup mocks
      const mockMembership = {
        role: 'admin',
      };
      
      const mockMemberToRemove = {
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      const mockFamily = {
        createdBy: 'user-789', // Different from both users
      };
      
      // First findOne is for admin check
      FamilyMember.findOne.mockResolvedValueOnce(mockMembership);
      
      // Second findOne is for finding member to remove
      FamilyMember.findOne.mockResolvedValueOnce(mockMemberToRemove);
      
      Family.findByPk.mockResolvedValue(mockFamily);
      
      // Call controller
      await familyController.removeFamilyMember(req, res);
      
      // Assertions
      expect(mockMemberToRemove.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Member removed successfully',
      });
    });
  });
  
  describe('deleteFamily', () => {
    beforeEach(() => {
      req = {
        params: { id: 'family-123' },
        user: { id: 'user-creator' },
      };
    });
    
    test('should delete a family if user is the creator', async () => {
      // Setup mocks
      const mockFamily = {
        id: 'family-123',
        createdBy: 'user-creator',
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      Family.findByPk.mockResolvedValue(mockFamily);
      FamilyMember.destroy.mockResolvedValue(true);
      
      // Call controller
      await familyController.deleteFamily(req, res);
      
      // Assertions
      expect(Family.findByPk).toHaveBeenCalledWith('family-123');
      expect(FamilyMember.destroy).toHaveBeenCalledWith({
        where: { familyId: 'family-123' },
      });
      expect(mockFamily.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Family deleted successfully',
      });
    });
  });
});