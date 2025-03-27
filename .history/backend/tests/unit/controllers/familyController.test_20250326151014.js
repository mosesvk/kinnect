// tests/unit/controllers/familyController.test.js

// Mock dependencies first
jest.mock('../../../src/models/Family', () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock('../../../src/models/FamilyMember', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock('../../../src/config/db', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

// Import controller and models
const Family = require('../../../src/models/Family');
const FamilyMember = require('../../../src/models/FamilyMember');
const User = require('../../../src/models/User');
const { sequelize } = require('../../../src/config/db');
const familyController = require('../../../src/controllers/familyController');
const { Op } = require('sequelize');

// Helper for validating UUID format
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

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
          description: 'A family for testing',
          settings: { privacyLevel: 'private' },
        },
        user: { id: 'user-123' },
      };
      
      // Mock family creation
      const mockCreatedFamily = {
        id: 'family-123',
        name: 'Test Family',
        description: 'A family for testing',
        settings: { privacyLevel: 'private' },
        createdBy: 'user-123',
      };
      
      Family.create.mockResolvedValueOnce(mockCreatedFamily);
      
      // Call the controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(Family.create).toHaveBeenCalledWith({
        name: 'Test Family',
        description: 'A family for testing',
        settings: { privacyLevel: 'private' },
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
        family: mockCreatedFamily,
      });
    });
    
    test('returns 400 if required fields are missing', async () => {
      // Set up request without name
      const req = {
        body: {
          description: 'A family for testing',
        },
        user: { id: 'user-123' },
      };
      
      // Call the controller
      await familyController.createFamily(req, res);
      
      // Assertions
      expect(Family.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please provide a family name',
      });
    });
    
    test('handles server error gracefully', async () => {
      // Set up request
      const req = {
        body: {
          name: 'Test Family',
          description: 'A family for testing',
        },
        user: { id: 'user-123' },
      };
      
      // Mock error during creation
      Family.create.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the controller
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
    test('gets a family by ID successfully', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        user: { id: 'user-123' },
      };
      
      // Mock family retrieval
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        description: 'A family for testing',
        createdBy: 'user-123',
        members: [
          {
            userId: 'user-123',
            role: 'admin',
            User: { id: 'user-123', firstName: 'Admin', lastName: 'User' }
          },
          {
            userId: 'user-456',
            role: 'member',
            User: { id: 'user-456', firstName: 'Member', lastName: 'User' }
          }
        ]
      };
      
      Family.findByPk.mockResolvedValueOnce(mockFamily);
      
      // Mock membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
        permissions: ['view', 'edit', 'delete', 'invite'],
      });
      
      // Call the controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(Family.findByPk).toHaveBeenCalledWith('family-123', expect.anything());
      expect(FamilyMember.findOne).toHaveBeenCalledWith({
        where: {
          familyId: 'family-123',
          userId: 'user-123',
        },
      });
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
        userRole: 'admin',
        userPermissions: ['view', 'edit', 'delete', 'invite'],
      });
    });
    
    test('returns 404 if family does not exist', async () => {
      // Set up request
      const req = {
        params: { id: 'nonexistent-family' },
        user: { id: 'user-123' },
      };
      
      // Mock family not found
      Family.findByPk.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Family not found',
      });
    });
    
    test('returns 403 if user is not a member of the family', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        user: { id: 'user-456' },
      };
      
      // Mock family exists
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        createdBy: 'user-123',
      };
      
      Family.findByPk.mockResolvedValueOnce(mockFamily);
      
      // Mock membership check - not a member
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this family',
      });
    });
    
    test('handles invalid UUID format', async () => {
      // Set up request with invalid UUID
      const req = {
        params: { id: 'invalid-uuid' },
        user: { id: 'user-123' },
      };
      
      // Mock isValidUUID function to return false by throwing a Sequelize error
      Family.findByPk.mockRejectedValueOnce({
        name: 'SequelizeDatabaseError',
        parent: {
          code: '22P02',
          routine: 'string_to_uuid'
        }
      });
      
      // Call the controller
      await familyController.getFamilyById(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Family not found',
      });
    });
  });
  
  describe('updateFamily', () => {
    test('updates a family successfully when user is admin', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        body: {
          name: 'Updated Family Name',
          description: 'Updated description',
          settings: { privacyLevel: 'public' },
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock family retrieval
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        description: 'Original description',
        settings: { privacyLevel: 'private' },
        save: jest.fn().mockResolvedValue(true),
      };
      
      Family.findByPk.mockResolvedValueOnce(mockFamily);
      
      // Call the controller
      await familyController.updateFamily(req, res);
      
      // Assertions
      expect(FamilyMember.findOne).toHaveBeenCalledWith({
        where: {
          familyId: 'family-123',
          userId: 'user-123',
          role: 'admin',
        },
      });
      
      expect(Family.findByPk).toHaveBeenCalledWith('family-123');
      expect(mockFamily.name).toBe('Updated Family Name');
      expect(mockFamily.description).toBe('Updated description');
      expect(mockFamily.settings).toEqual({ privacyLevel: 'public' });
      expect(mockFamily.save).toHaveBeenCalled();
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
      });
    });
    
    test('returns 403 if user is not an admin of the family', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        body: { name: 'Updated Family Name' },
        user: { id: 'user-456' },
      };
      
      // Mock admin membership check - not an admin
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.updateFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to update this family',
      });
    });
    
    test('returns 404 if family does not exist', async () => {
      // Set up request
      const req = {
        params: { id: 'nonexistent-family' },
        body: { name: 'Updated Family Name' },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'nonexistent-family',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock family not found
      Family.findByPk.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.updateFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Family not found',
      });
    });
    
    test('updates partial fields when not all fields are provided', async () => {
      // Set up request with only name update
      const req = {
        params: { id: 'family-123' },
        body: {
          name: 'Updated Family Name',
          // No description or settings
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock family retrieval
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        description: 'Original description',
        settings: { privacyLevel: 'private' },
        save: jest.fn().mockResolvedValue(true),
      };
      
      Family.findByPk.mockResolvedValueOnce(mockFamily);
      
      // Call the controller
      await familyController.updateFamily(req, res);
      
      // Assertions
      expect(mockFamily.name).toBe('Updated Family Name');
      expect(mockFamily.description).toBe('Original description'); // Should remain unchanged
      expect(mockFamily.settings).toEqual({ privacyLevel: 'private' }); // Should remain unchanged
      expect(mockFamily.save).toHaveBeenCalled();
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
      });
    });
  });
  
  describe('addFamilyMember', () => {
    test('adds a member to the family successfully', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        body: {
          email: 'newmember@example.com',
          role: 'member',
          permissions: ['view'],
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock user to add
      const userToAdd = {
        id: 'user-456',
        firstName: 'New',
        lastName: 'Member',
        email: 'newmember@example.com',
      };
      
      User.findOne.mockResolvedValueOnce(userToAdd);
      
      // Mock existing membership check - not already a member
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Mock membership creation
      const membership = {
        id: 'member-123',
        familyId: 'family-123',
        userId: 'user-456',
        role: 'member',
        permissions: ['view'],
      };
      
      FamilyMember.create.mockResolvedValueOnce(membership);
      
      // Call the controller
      await familyController.addFamilyMember(req, res);
      
      // Assertions
      expect(FamilyMember.findOne.mock.calls).toEqual([
        // First call - check if requester is admin
        [{ 
          where: { 
            familyId: 'family-123', 
            userId: 'user-123', 
            role: 'admin' 
          } 
        }],
        // Second call - check if user is already a member
        [{ 
          where: { 
            familyId: 'family-123', 
            userId: 'user-456' 
          } 
        }]
      ]);
      
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: 'newmember@example.com' } });
      
      expect(FamilyMember.create).toHaveBeenCalledWith({
        familyId: 'family-123',
        userId: 'user-456',
        role: 'member',
        permissions: ['view'],
      });
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        membership,
        user: {
          id: 'user-456',
          firstName: 'New',
          lastName: 'Member',
          email: 'newmember@example.com',
        },
      });
    });
    
    test('returns 403 if user is not an admin of the family', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        body: {
          email: 'newmember@example.com',
          role: 'member',
        },
        user: { id: 'user-456' },
      };
      
      // Mock admin membership check - not an admin
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.addFamilyMember(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to add members to this family',
      });
    });
    
    test('returns 404 if user to add is not found', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        body: {
          email: 'nonexistent@example.com',
          role: 'member',
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock user not found
      User.findOne.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.addFamilyMember(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found with this email',
      });
    });
    
    test('returns 400 if user is already a member of the family', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        body: {
          email: 'existing@example.com',
          role: 'member',
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock user to add
      const userToAdd = {
        id: 'user-456',
        email: 'existing@example.com',
      };
      
      User.findOne.mockResolvedValueOnce(userToAdd);
      
      // Mock existing membership check - already a member
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-456',
      });
      
      // Call the controller
      await familyController.addFamilyMember(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User is already a member of this family',
      });
    });
  });
  
  describe('removeFamilyMember', () => {
    test('removes a member from the family successfully', async () => {
      // Set up request
      const req = {
        params: { 
          id: 'family-123',
          userId: 'user-456'
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock membership to remove
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-456',
        role: 'member',
      });
      
      // Mock family retrieval
      Family.findByPk.mockResolvedValueOnce({
        id: 'family-123',
        createdBy: 'user-123', // Not the user being removed
      });
      
      // Mock successful deletion
      FamilyMember.destroy.mockResolvedValueOnce(1);
      
      // Call the controller
      await familyController.removeFamilyMember(req, res);
      
      // Assertions
      expect(FamilyMember.destroy).toHaveBeenCalledWith({
        where: { 
          familyId: 'family-123', 
          userId: 'user-456' 
        }
      });
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Member removed successfully',
      });
    });
    
    test('returns 403 if user is not an admin of the family', async () => {
      // Set up request
      const req = {
        params: { 
          id: 'family-123',
          userId: 'user-456'
        },
        user: { id: 'user-789' }, // Non-admin user
      };
      
      // Mock admin membership check - not an admin
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.removeFamilyMember(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to remove members from this family',
      });
    });
    
    test('returns 404 if member is not found', async () => {
      // Set up request
      const req = {
        params: { 
          id: 'family-123',
          userId: 'nonexistent-user'
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock member not found
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.removeFamilyMember(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User is not a member of this family',
      });
    });
    
    test('returns 400 if trying to remove the family creator', async () => {
      // Set up request to remove creator
      const req = {
        params: { 
          id: 'family-123',
          userId: 'creator-user'
        },
        user: { id: 'user-123' },
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'user-123',
        role: 'admin',
      });
      
      // Mock membership to remove
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'creator-user',
        role: 'admin',
      });
      
      // Mock family retrieval showing user to remove is creator
      Family.findByPk.mockResolvedValueOnce({
        id: 'family-123',
        createdBy: 'creator-user',
      });
      
      // Call the controller
      await familyController.removeFamilyMember(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot remove the family creator',
      });
    });
    
    test('returns 400 if trying to remove the last admin', async () => {
      // Set up request to remove last admin
      const req = {
        params: { 
          id: 'family-123',
          userId: 'admin-user'
        },
        user: { id: 'admin-user' }, // Removing self (as admin)
      };
      
      // Mock admin membership check
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'admin-user',
        role: 'admin',
      });
      
      // Mock membership to remove
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: 'family-123',
        userId: 'admin-user',
        role: 'admin',
      });
      
      // Mock family retrieval
      Family.findByPk.mockResolvedValueOnce({
        id: 'family-123',
        createdBy: 'creator-user', // Not the user being removed
      });
      
      // Mock admin count
      FamilyMember.count.mockResolvedValueOnce(1); // Only one admin
      
      // Call the controller
      await familyController.removeFamilyMember(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot remove the last admin from the family',
      });
    });
  });
  
  describe('deleteFamily', () => {
    test('deletes a family successfully when user is the creator', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        user: { id: 'user-123' },
      };
      
      // Mock family retrieval
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        createdBy: 'user-123', // User is creator
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      Family.findByPk.mockResolvedValueOnce(mockFamily);
      
      // Mock successful member deletion
      FamilyMember.destroy.mockResolvedValueOnce(3); // Deleted 3 members
      
      // Call the controller
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
    
    test('returns 404 if family does not exist', async () => {
      // Set up request
      const req = {
        params: { id: 'nonexistent-family' },
        user: { id: 'user-123' },
      };
      
      // Mock family not found
      Family.findByPk.mockResolvedValueOnce(null);
      
      // Call the controller
      await familyController.deleteFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Family not found',
      });
    });
    
    test('returns 403 if user is not the creator of the family', async () => {
      // Set up request
      const req = {
        params: { id: 'family-123' },
        user: { id: 'user-456' }, // Not the creator
      };
      
      // Mock family retrieval
      const mockFamily = {
        id: 'family-123',
        name: 'Test Family',
        createdBy: 'user-123', // Different from requesting user
      };
      
      Family.findByPk.mockResolvedValueOnce(mockFamily);
      
      // Call the controller
      await familyController.deleteFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only the family creator can delete it',
      });
    });
    
    test('handles invalid UUID format', async () => {
      // Set up request with invalid UUID
      const req = {
        params: { id: 'invalid-uuid' },
        user: { id: 'user-123' },
      };
      
      // Mock isValidUUID function to return false by throwing a Sequelize error
      Family.findByPk.mockRejectedValueOnce({
        name: 'SequelizeDatabaseError',
        parent: {
          code: '22P02',
          routine: 'string_to_uuid'
        }
      });
      
      // Call the controller
      await familyController.deleteFamily(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Family not found',
      });
    });
  });
});res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
        error: 'Database error',
      });
    });
  });
  
  describe('getUserFamilies', () => {
    test('gets all families for the user', async () => {
      // Set up request
      const req = {
        user: { id: 'user-123' },
      };
      
      // Mock database query response
      const mockFamilies = [
        {
          id: 'family-123',
          name: 'Test Family 1',
          description: 'Family 1 for testing',
          createdBy: 'user-123',
          userRole: 'admin',
          userPermissions: ['view', 'edit', 'delete', 'invite'],
        },
        {
          id: 'family-456',
          name: 'Test Family 2',
          description: 'Family 2 for testing',
          createdBy: 'user-456',
          userRole: 'member',
          userPermissions: ['view'],
        },
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
    
    test('handles empty results properly', async () => {
      // Set up request
      const req = {
        user: { id: 'user-no-families' },
      };
      
      // Mock empty response
      sequelize.query.mockResolvedValueOnce([]);
      
      // Call the controller
      await familyController.getUserFamilies(req, res);
      
      // Assertions
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        families: [],
      });
    });
    
    test('handles server error gracefully', async () => {
      // Set up request
      const req = {
        user: { id: 'user-123' },
      };
      
      // Mock database error
      sequelize.query.mockRejectedValueOnce(new Error('Database error'));
      
      // Call the controller
      await familyController.getUserFamilies(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(