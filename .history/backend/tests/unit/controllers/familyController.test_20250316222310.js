// First, mock the dependencies before any imports
// This is critical because Jest hoists mock declarations
jest.mock('../../../src/models/Family', () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock('../../../src/models/FamilyMember', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../../src/config/db', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

// NOW import the controller and models
const Family = require('../../../src/models/Family');
const FamilyMember = require('../../../src/models/FamilyMember');
const User = require('../../../src/models/User');
const { sequelize } = require('../../../src/config/db');
const familyController = require('../../../src/controllers/familyController');

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
      
      Family.create.mockResolvedValueOnce(mockCreatedFamily);
      FamilyMember.create.mockResolvedValueOnce({ id: 'member123' });
      
      // Call the controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(Family.create).toHaveBeenCalledWith({
        name: 'Test Family',
        description: 'Test description',
        createdBy: 'user123',
      });
      
      expect(FamilyMember.create).toHaveBeenCalledWith({
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
      expect(Family.create).not.toHaveBeenCalled();
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
      
      sequelize.query.mockResolvedValueOnce([mockFamilies]);
      
      // Call the controller
      await familyController.getUserFamilies(req, res);
      
      // Assertions
      expect(sequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        families: mockFamilies,
      });
    });
  });
});