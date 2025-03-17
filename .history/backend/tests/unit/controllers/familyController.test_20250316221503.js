// Mock the required modules
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockDestroy = jest.fn();
const mockCreate = jest.fn();
const mockSave = jest.fn();
const mockQuery = jest.fn();

// Mock the models
jest.mock('../../../src/models/Family', () => ({
  findByPk: mockFindByPk,
  create: mockCreate,
}));

jest.mock('../../../src/models/FamilyMember', () => ({
  findOne: mockFindOne,
  create: mockCreate,
  destroy: mockDestroy,
}));

jest.mock('../../../src/config/db', () => ({
  sequelize: {
    query: mockQuery,
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

// Import the controller after mocking
const controller = require('../../../src/controllers/familyController');

describe('Family Controller', () => {
  // Create a fresh response mock for each test
  let res;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up the response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('createFamily', () => {
    it('should create a family successfully', async () => {
      // Set up request
      const req = {
        body: {
          name: 'Test Family',
          description: 'A test family',
        },
        user: { id: 'user-123' },
      };

      // Mock successful family creation
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        description: 'A test family',
      };
      mockCreate.mockResolvedValueOnce(mockFamily);
      mockCreate.mockResolvedValueOnce({ id: 'member-123' });

      // Call the controller
      await controller.createFamily(req, res);

      // Expect successful response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
      });
    });
  });

  describe('getFamilyById', () => {
    it('should return a family if user is a member', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        user: { id: 'user-123' },
      };

      // Mock family and membership
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
      };
      const mockMembership = {
        role: 'admin',
        permissions: ['view', 'edit'],
      };

      mockFindByPk.mockResolvedValueOnce(mockFamily);
      mockFindOne.mockResolvedValueOnce(mockMembership);

      // Call the controller
      await controller.getFamilyById(req, res);

      // Expect successful response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
        userRole: 'admin',
        userPermissions: ['view', 'edit'],
      });
    });

    it('should return 404 if family not found', async () => {
      // Set up request
      const req = {
        params: { id: 'nonexistent' },
        user: { id: 'user-123' },
      };

      // Mock family not found
      mockFindByPk.mockResolvedValueOnce(null);

      // Call the controller
      await controller.getFamilyById(req, res);

      // Expect not found response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Family not found',
      });
    });

    it('should return 403 if user is not a member', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        user: { id: 'user-456' },
      };

      // Mock family found but user not a member
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
      };

      mockFindByPk.mockResolvedValueOnce(mockFamily);
      mockFindOne.mockResolvedValueOnce(null);  // No membership found

      // Call the controller
      await controller.getFamilyById(req, res);

      // Expect unauthorized response
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this family',
      });
    });
  });

  describe('getUserFamilies', () => {
    it('should return all families for the user', async () => {
      // Set up request
      const req = {
        user: { id: 'user-123' },
      };

      // Mock families found
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

      mockQuery.mockResolvedValueOnce([mockFamilies]);

      // Call the controller
      await controller.getUserFamilies(req, res);

      // Expect successful response
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        families: mockFamilies,
      });
    });
  });

  describe('removeFamilyMember', () => {
    it('should remove a member from the family', async () => {
      // Set up request
      const req = {
        params: {
          id: 'family-123',
          userId: 'user-456',
        },
        user: { id: 'user-123' },
      };

      // Mock admin membership check
      mockFindOne.mockResolvedValueOnce({
        role: 'admin',
      });

      // Mock member to remove
      const mockMemberToRemove = {
        destroy: mockDestroy,
      };
      mockFindOne.mockResolvedValueOnce(mockMemberToRemove);

      // Mock family
      mockFindByPk.mockResolvedValueOnce({
        createdBy: 'user-789',  // Different from the user being removed
      });

      mockDestroy.mockResolvedValueOnce(true);

      // Call the controller
      await controller.removeFamilyMember(req, res);

      // Expect successful response
      expect(mockDestroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Member removed successfully',
      });
    });
  });

  describe('deleteFamily', () => {
    it('should delete a family if user is the creator', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        user: { id: 'user-creator' },
      };

      // Mock family
      const mockFamily = {
        id: 'family-123',
        createdBy: 'user-creator',
        destroy: mockDestroy,
      };
      mockFindByPk.mockResolvedValueOnce(mockFamily);

      // Mock successful delete of family members
      mockDestroy.mockResolvedValueOnce(true);
      mockDestroy.mockResolvedValueOnce(true);

      // Call the controller
      await controller.deleteFamily(req, res);

      // Expect successful response
      expect(mockFindByPk).toHaveBeenCalledWith('family-123');
      expect(mockDestroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Family deleted successfully',
      });
    });
  });
});