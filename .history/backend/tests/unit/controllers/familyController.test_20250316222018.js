// Import the controller directly, but we'll mock its dependencies
const familyController = require('../../../src/controllers/familyController');

// Create mocks for the dependencies
const mockFamily = {
  create: jest.fn(),
  findByPk: jest.fn(),
};

const mockFamilyMember = {
  create: jest.fn(),
  findOne: jest.fn(),
  destroy: jest.fn(),
};

const mockUser = {
  findOne: jest.fn(),
};

const mockSequelize = {
  query: jest.fn(),
};

// Mock the dependencies
jest.mock('../../../src/models/Family', () => mockFamily);
jest.mock('../../../src/models/FamilyMember', () => mockFamilyMember);
jest.mock('../../../src/models/User', () => mockUser);
jest.mock('../../../src/config/db', () => ({
  sequelize: mockSequelize,
}));

describe('Family Controller', () => {
  // Create a standard response mock
  let res;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });
  
  describe('createFamily', () => {
    test('creates a family successfully', async () => {
      // Set up request
      const req = {
        body: {
          name: 'Test Family',
          description: 'Test description',
        },
        user: { id: 'user123' },
      };
      
      // Set up mocks
      const mockCreatedFamily = {
        id: 'family123',
        name: 'Test Family',
        description: 'Test description',
      };
      
      mockFamily.create.mockResolvedValueOnce(mockCreatedFamily);
      mockFamilyMember.create.mockResolvedValueOnce({ id: 'member123' });
      
      // Call the controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(mockFamily.create).toHaveBeenCalledWith({
        name: 'Test Family',
        description: 'Test description',
        createdBy: 'user123',
      });
      
      expect(mockFamilyMember.create).toHaveBeenCalledWith({
        familyId: 'family123',
        userId: 'user123',
        role: 'admin',
        permissions: ['view', 'edit', 'delete', 'invite'],
      });
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockCreatedFamily,
      });
    });
    
    test('returns 400 if family name is missing', async () => {
      // Set up request without a name
      const req = {
        body: {
          description: 'Test description',
        },
        user: { id: 'user123' },
      };
      
      // Call the controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please provide a family name',
      });
      expect(mockFamily.create).not.toHaveBeenCalled();
    });
  });
  
  describe('getUserFamilies', () => {
    test('returns families for the user', async () => {
      // Set up request
      const req = {
        user: { id: 'user123' },
      };
      
      // Set up mock response from database
      const mockFamilies = [
        { id: 'family1', name: 'Family 1' },
        { id: 'family2', name: 'Family 2' },
      ];
      
      mockSequelize.query.mockResolvedValueOnce([mockFamilies]);
      
      // Call the controller
      await familyController.getUserFamilies(req, res);
      
      // Assertions
      expect(mockSequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        families: mockFamilies,
      });
    });
  });
});