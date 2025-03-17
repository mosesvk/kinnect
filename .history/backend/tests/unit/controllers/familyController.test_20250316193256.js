// tests/unit/controllers/familyController.test.js
const {
    createFamily,
    getUserFamilies,
    getFamilyById,
    updateFamily,
    addFamilyMember,
    removeFamilyMember,
    deleteFamily
  } = require('../../../src/controllers/familyController');
  const Family = require('../../../src/models/Family');
  const FamilyMember = require('../../../src/models/FamilyMember');
  const User = require('../../../src/models/User');
  const { sequelize } = require('../../../src/config/db');
  
  // Mock the models and database functions
  jest.mock('../../../src/models/Family', () => {
    return {
      create: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
    };
  });
  
  jest.mock('../../../src/models/FamilyMember', () => {
    return {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      destroy: jest.fn(),
      count: jest.fn()
    };
  });
  
  jest.mock('../../../src/models/User', () => {
    return {
      findOne: jest.fn(),
      findByPk: jest.fn()
    };
  });
  
  jest.mock('../../../src/config/db', () => ({
    sequelize: {
      query: jest.fn(),
      QueryTypes: { SELECT: 'SELECT' },
      define: jest.fn()
    }
  }));
  
  describe('Family Controller Unit Tests', () => {
    // Reset mocks before each test
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    describe('createFamily', () => {
      it('should create a family and add creator as admin', async () => {
        // Mock request and response objects
        const req = {
          body: {
            name: 'Test Family',
            description: 'Test Description',
            settings: { privacyLevel: 'private' }
          },
          user: { id: 'user-123' }
        };
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
  
        // Mock the Family.create and FamilyMember.create methods
        const createdFamily = {
          id: 'family-123',
          name: 'Test Family',
          description: 'Test Description',
          settings: { privacyLevel: 'private' },
          createdBy: 'user-123'
        };
        
        Family.create.mockResolvedValue(createdFamily);
        FamilyMember.create.mockResolvedValue({
          id: 'member-123',
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin'
        });
  
        // Call the function
        await createFamily(req, res);
  
        // Assertions
        expect(Family.create).toHaveBeenCalledWith({
          name: 'Test Family',
          description: 'Test Description',
          settings: { privacyLevel: 'private' },
          createdBy: 'user-123'
        });
        
        expect(FamilyMember.create).toHaveBeenCalledWith({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin',
          permissions: ['view', 'edit', 'delete', 'invite']
        });
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          family: createdFamily
        });
      });
  
      it('should return 400 if name is not provided', async () => {
        // Mock request and response objects
        const req = {
          body: {
            description: 'Test Description',
          },
          user: { id: 'user-123' }
        };
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
  
        // Call the function
        await createFamily(req, res);
  
        // Assertions
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Please provide a family name'
        });
        expect(Family.create).not.toHaveBeenCalled();
      });
  
      it('should handle errors', async () => {
        // Mock request and response objects
        const req = {
          body: {
            name: 'Test Family',
          },
          user: { id: 'user-123' }
        };
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
  
        // Mock the error
        const error = new Error('Database error');
        Family.create.mockRejectedValue(error);
  
        // Call the function
        await createFamily(req, res);
  
        // Assertions
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Server error',
          error: 'Database error'
        });
      });
    });
  
    describe('getFamilyById', () => {
      it('should return a family by id if user is a member', async () => {
        // Mock request and response objects
        const req = {
          params: { id: 'family-123' },
          user: { id: 'user-123' }
        };
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
  
        // Mock FamilyMember.findOne and Family.findByPk
        const membership = {
          role: 'admin',
          permissions: ['view', 'edit', 'delete', 'invite']
        };
  
        const family = {
          id: 'family-123',
          name: 'Test Family',
          description: 'Test Description',
          members: [
            { userId: 'user-123', role: 'admin' }
          ]
        };
  
        FamilyMember.findOne.mockResolvedValue(membership);
        Family.findByPk.mockResolvedValue(family);
  
        // Call the function
        await getFamilyById(req, res);
  
        // Assertions
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123'
          }
        });
        
        expect(Family.findByPk).toHaveBeenCalledWith('family-123', expect.any(Object));
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          family,
          userRole: 'admin',
          userPermissions: ['view', 'edit', 'delete', 'invite']
        });
      });
  
      it('should return 403 if user is not a member of the family', async () => {
        // Mock request and response objects
        const req = {
          params: { id: 'family-123' },
          user: { id: 'user-123' }
        };
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
  
        // Mock FamilyMember.findOne to return null (user not a member)
        FamilyMember.findOne.mockResolvedValue(null);
  
        // Call the function
        await getFamilyById(req, res);
  
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to access this family'
        });
        expect(Family.findByPk).not.toHaveBeenCalled();
      });
  
      it('should return 404 if family is not found', async () => {
        // Mock request and response objects
        const req = {
          params: { id: 'family-123' },
          user: { id: 'user-123' }
        };
        
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };
  
        // Mock FamilyMember.findOne and Family.findByPk
        FamilyMember.findOne.mockResolvedValue({ role: 'member' });
        Family.findByPk.mockResolvedValue(null);
  
        // Call the function
        await getFamilyById(req, res);
  
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Family not found'
        });
      });
    });
  
    // Add similar tests for other controller functions (updateFamily, deleteFamily, etc.)
  });