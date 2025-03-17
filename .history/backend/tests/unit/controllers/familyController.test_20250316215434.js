// Mock the models and database functions
jest.mock("../../../src/models/Family", () => {
  return {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
  };
});

jest.mock("../../../src/models/FamilyMember", () => {
  return {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
  };
});

jest.mock("../../../src/models/User", () => {
  return {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  };
});

jest.mock("../../../src/config/db", () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: "SELECT" },
  },
}));

// Import the controller and mocked models after the mocking is set up
const {
  createFamily,
  getUserFamilies,
  getFamilyById,
  updateFamily,
  addFamilyMember,
  removeFamilyMember,
  deleteFamily,
} = require("../../../src/controllers/familyController");
const Family = require("../../../src/models/Family");
const FamilyMember = require("../../../src/models/FamilyMember");
const User = require("../../../src/models/User");
const { sequelize } = require("../../../src/config/db");

// Helper function to create a properly mocked response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Family Controller Unit Tests", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up consistent mock implementations
    FamilyMember.findOne.mockImplementation(({ where }) => {
      // For admin permission check
      if (where && where.familyId === "family-123" && where.userId === "user-123" && where.role === "admin") {
        return Promise.resolve({
          id: "member-123",
          familyId: "family-123",
          userId: "user-123",
          role: "admin",
          permissions: ["view", "edit", "delete", "invite"]
        });
      }
      
      // For membership check (without role)
      if (where && where.familyId === "family-123" && where.userId === "user-123" && !where.role) {
        return Promise.resolve({
          id: "member-123",
          familyId: "family-123",
          userId: "user-123",
          role: "admin",
          permissions: ["view", "edit", "delete", "invite"]
        });
      }
      
      // For non-admin users or non-members
      if ((where && where.userId !== "user-123") || (where && where.familyId !== "family-123")) {
        return Promise.resolve(null);
      }
      
      return Promise.resolve(null);
    });
    
    // Fix sequelize.query mock for getUserFamilies
    sequelize.query.mockImplementation((query, options) => {
      if (query.includes('FROM "Families" f') && options.replacements && options.replacements.userId) {
        const userId = options.replacements.userId;
        
        if (userId === 'user-123') {
          // Return test families data
          return Promise.resolve([
            [
              {
                id: 'family-123',
                name: 'Test Family 1',
                description: 'Family for testing',
                createdBy: 'user-123',
                settings: { privacyLevel: 'private' },
                userRole: 'admin',
                userPermissions: ['view', 'edit', 'delete', 'invite'],
                joinedAt: new Date().toISOString()
              },
              {
                id: 'family-456',
                name: 'Test Family 2',
                description: 'Another family for testing',
                createdBy: 'user-456',
                settings: { privacyLevel: 'private' },
                userRole: 'member',
                userPermissions: ['view'],
                joinedAt: new Date().toISOString()
              }
            ]
          ]);
        } else {
          // Return empty results for other users
          return Promise.resolve([[]]);
        }
      }
      
      // Default return empty results
      return Promise.resolve([[]]);
    });
  });

  describe("createFamily", () => {
    it("should create a family and add creator as admin", async () => {
      // Mock request and response objects
      const req = {
        body: {
          name: "Test Family",
          description: "Test Description",
          settings: { privacyLevel: "private" },
        },
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Mock the Family.create and FamilyMember.create methods
      const createdFamily = {
        id: "family-123",
        name: "Test Family",
        description: "Test Description",
        settings: { privacyLevel: "private" },
        createdBy: "user-123",
      };

      Family.create.mockResolvedValue(createdFamily);
      FamilyMember.create.mockResolvedValue({
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
      });

      // Call the function
      await createFamily(req, res);

      // Assertions
      expect(Family.create).toHaveBeenCalledWith({
        name: "Test Family",
        description: "Test Description",
        settings: { privacyLevel: "private" },
        createdBy: "user-123",
      });

      expect(FamilyMember.create).toHaveBeenCalledWith({
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
        permissions: ["view", "edit", "delete", "invite"],
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: createdFamily,
      });
    });

    it("should return 400 if name is not provided", async () => {
      // Mock request and response objects
      const req = {
        body: {
          description: "Test Description",
        },
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Call the function
      await createFamily(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Please provide a family name",
      });
      expect(Family.create).not.toHaveBeenCalled();
    });

    it("should handle server errors", async () => {
      // Mock request and response objects
      const req = {
        body: {
          name: "Test Family",
        },
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Mock the error
      const error = new Error("Database error");
      Family.create.mockRejectedValue(error);

      // Call the function
      await createFamily(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
      });
    });
  });

  describe('getUserFamilies', () => {
    it('should get all families for the user', async () => {
      // Mock request and response objects
      const req = {
        user: { id: 'user-123' }
      };
      
      const res = createMockResponse();
  
      // Call the function
      await getUserFamilies(req, res);
  
      // Assertions
      expect(sequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        families: expect.any(Array)
      });
      
      // Verify the response contains the expected families
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.families.length).toBe(2);
      expect(responseData.families[0].id).toBe('family-123');
      expect(responseData.families[1].id).toBe('family-456');
    });
  
    it('should handle empty results', async () => {
      // Mock request and response objects
      const req = {
        user: { id: 'user-456' } // Different user that has no families
      };
      
      const res = createMockResponse();
  
      // Call the function
      await getUserFamilies(req, res);
  
      // Assertions
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        families: []
      });
    });
  
    it('should handle server errors', async () => {
      // Mock request and response objects
      const req = {
        user: { id: 'user-123' }
      };
      
      const res = createMockResponse();
  
      // Mock query error
      const error = new Error('Database error');
      sequelize.query.mockRejectedValue(error);
  
      // Call the function
      await getUserFamilies(req, res);
  
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
        error: 'Database error'
      });
    });
  });
  
  describe("getFamilyById", () => {
    it("should return a family by id if user is a member", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Mock Family.findByPk
      const family = {
        id: "family-123",
        name: "Test Family",
        description: "Test Description",
        members: [{ userId: "user-123", role: "admin" }],
      };

      Family.findByPk.mockResolvedValue(family);

      // Call the function
      await getFamilyById(req, res);

      // Assertions
      expect(FamilyMember.findOne).toHaveBeenCalledWith({
        where: {
          familyId: "family-123",
          userId: "user-123",
        },
      });

      expect(Family.findByPk).toHaveBeenCalledWith(
        "family-123",
        expect.any(Object)
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family,
        userRole: "admin",
        userPermissions: ["view", "edit", "delete", "invite"],
      });
    });

    it("should return 403 if user is not a member of the family", async () => {
      // Override the default mock for this specific test
      FamilyMember.findOne.mockResolvedValueOnce(null);
      
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-456" },  // Different user
      };

      const res = createMockResponse();

      // Mock Family.findByPk
      const family = {
        id: "family-123",
        name: "Test Family",
      };

      Family.findByPk.mockResolvedValue(family);

      // Call the function
      await getFamilyById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized to access this family",
      });
    });

    it("should return 404 if family is not found", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "nonexistent-family" },
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Mock Family.findByPk to return null
      Family.findByPk.mockResolvedValue(null);

      // Call the function
      await getFamilyById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Family not found",
      });
    });

    it("should handle server errors", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Mock error
      const error = new Error("Database error");
      Family.findByPk.mockRejectedValue(error);

      // Call the function
      await getFamilyById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
      });
    });
  });

  // Add other test cases following the same pattern...
  // updateFamily, addFamilyMember, removeFamilyMember, and deleteFamily
  
  // Example for updateFamily:
  describe("updateFamily", () => {
    it("should update a family if user is an admin", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
        body: {
          name: "Updated Family Name",
          description: "Updated Description",
        },
      };

      const res = createMockResponse();

      // Mock Family.findByPk
      const mockFamily = {
        id: "family-123",
        name: "Test Family",
        description: "Test Description",
        settings: { privacyLevel: "private" },
        save: jest.fn().mockResolvedValue(true),
      };

      Family.findByPk.mockResolvedValue(mockFamily);

      // Call the function
      await updateFamily(req, res);

      // Assertions
      expect(FamilyMember.findOne).toHaveBeenCalledWith({
        where: {
          familyId: "family-123",
          userId: "user-123",
          role: "admin",
        },
      });

      expect(Family.findByPk).toHaveBeenCalledWith("family-123");

      // Check that family properties were updated
      expect(mockFamily.name).toBe("Updated Family Name");
      expect(mockFamily.description).toBe("Updated Description");
      expect(mockFamily.save).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family: mockFamily,
      });
    });
  })

  describe("addFamilyMember", () => {
    it("should add a member to the family", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
        body: {
          email: "test@example.com",
          role: "member",
          permissions: ["view"],
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock user lookup
      const userToAdd = {
        id: "user-456",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      };
      User.findOne.mockResolvedValueOnce(userToAdd);

      // Mock existing membership check
      FamilyMember.findOne.mockResolvedValueOnce(null);

      // Mock create new membership
      const newMembership = {
        id: "member-456",
        familyId: "family-123",
        userId: "user-456",
        role: "member",
        permissions: ["view"],
      };
      FamilyMember.create.mockResolvedValue(newMembership);

      // Call the function
      await addFamilyMember(req, res);

      // Assertions
      expect(FamilyMember.findOne.mock.calls[0][0]).toEqual({
        where: {
          familyId: "family-123",
          userId: "user-123",
          role: "admin",
        },
      });

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });

      expect(FamilyMember.create).toHaveBeenCalledWith({
        familyId: "family-123",
        userId: "user-456",
        role: "member",
        permissions: ["view"],
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        membership: newMembership,
        user: {
          id: "user-456",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        },
      });
    });

    it("should return 403 if user is not an admin", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
        body: {
          email: "test@example.com",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check - not an admin
      FamilyMember.findOne.mockResolvedValue(null);

      // Call the function
      await addFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized to add members to this family",
      });
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it("should return 404 if user to add is not found", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
        body: {
          email: "nonexistent@example.com",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check - is admin
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock user lookup - not found
      User.findOne.mockResolvedValueOnce(null);

      // Call the function
      await addFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found with this email",
      });
      expect(FamilyMember.create).not.toHaveBeenCalled();
    });

    it("should return 400 if user is already a member", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
        body: {
          email: "existing@example.com",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check - is admin
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock user lookup
      const existingUser = {
        id: "user-789",
        email: "existing@example.com",
      };
      User.findOne.mockResolvedValueOnce(existingUser);

      // Mock existing membership check - already a member
      FamilyMember.findOne.mockResolvedValueOnce({
        id: "member-789",
        familyId: "family-123",
        userId: "user-789",
      });

      // Call the function
      await addFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User is already a member of this family",
      });
      expect(FamilyMember.create).not.toHaveBeenCalled();
    });

    it("should handle server errors", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
        body: {
          email: "test@example.com",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock error
      const error = new Error("Database error");
      FamilyMember.findOne.mockRejectedValue(error);

      // Call the function
      await addFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
      });
    });
  });

  describe("removeFamilyMember", () => {
    it("should remove a member from the family", async () => {
      // Mock request and response objects
      const req = {
        params: {
          id: "family-123",
          userId: "user-456",
        },
        user: { id: "user-123" },
      };

      const res = {
        json: jest.fn(),
      };

      // Mock admin check
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock the membership to remove
      const membershipToRemove = {
        familyId: "family-123",
        userId: "user-456",
        role: "member",
        destroy: jest.fn().mockResolvedValue(true),
      };
      FamilyMember.findOne.mockResolvedValueOnce(membershipToRemove);

      // Mock the family
      const family = {
        id: "family-123",
        createdBy: "user-123", // Different from the user being removed
      };
      Family.findByPk.mockResolvedValue(family);

      // Call the function
      await removeFamilyMember(req, res);

      // Assertions
      expect(membershipToRemove.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Member removed successfully",
      });
    });

    it("should return 403 if user is not an admin", async () => {
      // Mock request and response objects
      const req = {
        params: {
          id: "family-123",
          userId: "user-456",
        },
        user: { id: "user-123" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check - not an admin
      FamilyMember.findOne.mockResolvedValue(null);

      // Call the function
      await removeFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized to remove members from this family",
      });
    });

    it("should return 404 if member is not found", async () => {
      // Mock request and response objects
      const req = {
        params: {
          id: "family-123",
          userId: "user-456",
        },
        user: { id: "user-123" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check - is admin
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock membership lookup - not found
      FamilyMember.findOne.mockResolvedValueOnce(null);

      // Call the function
      await removeFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User is not a member of this family",
      });
    });

    it("should not allow removing the family creator", async () => {
      // Mock request and response objects
      const req = {
        params: {
          id: "family-123",
          userId: "user-creator",
        },
        user: { id: "user-123" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check - is admin
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock the membership to remove
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: "family-123",
        userId: "user-creator",
        role: "admin",
      });

      // Mock the family - the user is the creator
      const family = {
        createdBy: "user-creator",
      };
      Family.findByPk.mockResolvedValue(family);

      // Call the function
      await removeFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Cannot remove the family creator",
      });
    });

    it("should not allow removing the last admin", async () => {
      // Mock request and response objects
      const req = {
        params: {
          id: "family-123",
          userId: "user-admin",
        },
        user: { id: "user-123" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock admin check - is admin
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock the membership to remove (an admin)
      FamilyMember.findOne.mockResolvedValueOnce({
        familyId: "family-123",
        userId: "user-admin",
        role: "admin",
      });

      // Mock the family - not the creator
      const family = {
        createdBy: "user-creator",
      };
      Family.findByPk.mockResolvedValue(family);

      // Mock admin count - only 1 admin
      FamilyMember.count.mockResolvedValue(1);

      // Call the function
      await removeFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Cannot remove the last admin from the family",
      });
    });

    it("should handle server errors", async () => {
      // Mock request and response objects
      const req = {
        params: {
          id: "family-123",
          userId: "user-456",
        },
        user: { id: "user-123" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock error
      const error = new Error("Database error");
      FamilyMember.findOne.mockRejectedValue(error);

      // Call the function
      await removeFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
      });
    });
  });

  describe("deleteFamily", () => {
    it("should delete a family if user is the creator", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-creator" },
      };

      const res = {
        json: jest.fn(),
      };

      // Mock the family
      const family = {
        id: "family-123",
        createdBy: "user-creator",
        destroy: jest.fn().mockResolvedValue(true),
      };
      Family.findByPk.mockResolvedValue(family);

      // Mock FamilyMember destroy
      FamilyMember.destroy.mockResolvedValue(true);

      // Call the function
      await deleteFamily(req, res);

      // Assertions
      expect(Family.findByPk).toHaveBeenCalledWith("family-123");
      expect(FamilyMember.destroy).toHaveBeenCalledWith({
        where: { familyId: "family-123" },
      });
      expect(family.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Family deleted successfully",
      });
    });

    it("should return 404 if family is not found", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-creator" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock family not found
      Family.findByPk.mockResolvedValue(null);

      // Call the function
      await deleteFamily(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Family not found",
      });
      expect(FamilyMember.destroy).not.toHaveBeenCalled();
    });

    it("should return 403 if user is not a member of the family", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Mock FamilyMember.findOne to return null (user not a member)
      FamilyMember.findOne.mockResolvedValue(null);

      // Call the function
      await getFamilyById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized to access this family",
      });
      expect(Family.findByPk).not.toHaveBeenCalled();
    });

    it("should handle server errors", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-creator" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock error
      const error = new Error("Database error");
      Family.findByPk.mockRejectedValue(error);

      // Call the function
      await deleteFamily(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
      });
    });
  });
})