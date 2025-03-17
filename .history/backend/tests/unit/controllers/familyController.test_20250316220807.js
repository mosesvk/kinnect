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
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
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
      
      // Reset Family.create mock to ensure it's not called
      Family.create.mockReset();

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

  describe("getUserFamilies", () => {
    it("should get all families for the user", async () => {
      // Mock request and response objects
      const req = {
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Setup mock data
      const mockFamilies = [
        {
          id: "family-123",
          name: "Test Family 1",
          description: "Family for testing",
          createdBy: "user-123",
          settings: { privacyLevel: "private" },
          userRole: "admin",
          userPermissions: ["view", "edit", "delete", "invite"],
          joinedAt: new Date().toISOString(),
        },
        {
          id: "family-456",
          name: "Test Family 2",
          description: "Another family for testing",
          createdBy: "user-456",
          settings: { privacyLevel: "private" },
          userRole: "member",
          userPermissions: ["view"],
          joinedAt: new Date().toISOString(),
        },
      ];

      // Mock sequelize query to return families
      sequelize.query.mockResolvedValue([mockFamilies]);

      // Call the function
      await getUserFamilies(req, res);

      // Assertions
      expect(sequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        families: mockFamilies,
      });
    });

    it("should handle empty results", async () => {
      // Mock request and response objects
      const req = {
        user: { id: "user-456" },
      };

      const res = createMockResponse();

      // Mock empty results
      sequelize.query.mockResolvedValue([[]]);

      // Call the function
      await getUserFamilies(req, res);

      // Assertions
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        families: [],
      });
    });

    it("should handle server errors", async () => {
      // Mock request and response objects
      const req = {
        user: { id: "user-123" },
      };

      const res = createMockResponse();

      // Mock database error
      const error = new Error("Database error");
      sequelize.query.mockRejectedValue(error);

      // Call the function
      await getUserFamilies(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
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

      // Mock family data
      const family = {
        id: "family-123",
        name: "Test Family",
        description: "Test Description",
        members: [{ userId: "user-123", role: "admin" }],
      };

      // Mock findByPk to return the family
      Family.findByPk.mockResolvedValue(family);

      // Mock findOne to indicate user is a member
      const membership = {
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
        permissions: ["view", "edit", "delete", "invite"],
      };
      FamilyMember.findOne.mockResolvedValue(membership);

      // Call the function
      await getFamilyById(req, res);

      // Assertions
      expect(Family.findByPk).toHaveBeenCalledWith(
        "family-123",
        expect.any(Object)
      );
      expect(FamilyMember.findOne).toHaveBeenCalledWith({
        where: {
          familyId: "family-123",
          userId: "user-123",
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family,
        userRole: "admin",
        userPermissions: ["view", "edit", "delete", "invite"],
      });
    });

    it("should return 403 if user is not a member of the family", async () => {
      // Mock request and response objects
      const req = {
        params: { id: "family-123" },
        user: { id: "user-456" },
      };

      const res = createMockResponse();

      // Mock family exists
      const family = {
        id: "family-123",
        name: "Test Family",
      };
      Family.findByPk.mockResolvedValue(family);

      // Mock user is not a member
      FamilyMember.findOne.mockResolvedValue(null);

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

      // Mock family not found
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

      // Mock database error
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

      // Mock admin membership
      const membership = {
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
      };
      FamilyMember.findOne.mockResolvedValue(membership);

      // Mock family
      const family = {
        id: "family-123",
        name: "Test Family",
        description: "Test Description",
        settings: { privacyLevel: "private" },
        save: jest.fn().mockResolvedValue(true),
      };
      Family.findByPk.mockResolvedValue(family);

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
      expect(family.name).toBe("Updated Family Name");
      expect(family.description).toBe("Updated Description");
      expect(family.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        family,
      });
    });
  });

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

      const res = createMockResponse();

      // Mock admin membership check
      const adminMembership = {
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
      };
      FamilyMember.findOne.mockImplementation(({ where }) => {
        if (where.role === "admin" && where.userId === "user-123") {
          return Promise.resolve(adminMembership);
        }
        return Promise.resolve(null);
      });

      // Mock user to add
      const userToAdd = {
        id: "user-456",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      };
      User.findOne.mockResolvedValue(userToAdd);

      // Mock new membership
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

      const res = createMockResponse();

      // Mock non-admin membership check
      FamilyMember.findOne.mockResolvedValue(null);

      // Call the function
      await addFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized to add members to this family",
      });
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

      const res = createMockResponse();

      // Mock admin membership check
      const adminMembership = {
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
      };
      FamilyMember.findOne.mockResolvedValue(adminMembership);

      // Mock user not found
      User.findOne.mockResolvedValue(null);

      // Call the function
      await addFamilyMember(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found with this email",
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

      const res = createMockResponse();

      // Mock admin membership check
      const adminMembership = {
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
      };
      
      // Mock member to remove
      const memberToRemove = {
        id: "member-456",
        familyId: "family-123",
        userId: "user-456",
        role: "member",
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      // Setup mock implementation
      FamilyMember.findOne.mockImplementation(({ where }) => {
        if (where.role === "admin" && where.userId === "user-123") {
          return Promise.resolve(adminMembership);
        }
        if (where.userId === "user-456" && where.familyId === "family-123") {
          return Promise.resolve(memberToRemove);
        }
        return Promise.resolve(null);
      });

      // Mock family
      const family = {
        id: "family-123",
        createdBy: "user-789", // Different from both users
      };
      Family.findByPk.mockResolvedValue(family);

      // Call the function
      await removeFamilyMember(req, res);

      // Assertions
      expect(memberToRemove.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Member removed successfully",
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

      const res = createMockResponse();

      // Mock family
      const family = {
        id: "family-123",
        createdBy: "user-creator",
        destroy: jest.fn().mockResolvedValue(true),
      };
      Family.findByPk.mockResolvedValue(family);

      // Mock successful delete of family members
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
  });
});