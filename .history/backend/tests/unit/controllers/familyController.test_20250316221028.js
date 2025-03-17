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
const familyController = require("../../../src/controllers/familyController");
const Family = require("../../../src/models/Family");
const FamilyMember = require("../../../src/models/FamilyMember");
const User = require("../../../src/models/User");
const { sequelize } = require("../../../src/config/db");

describe("Family Controller Unit Tests", () => {
  let req, res;

  // Basic setup for each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Create a fresh res mock for each test
    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    };
  });

  describe("createFamily", () => {
    beforeEach(() => {
      req = {
        body: {
          name: "Test Family",
          description: "Test Description",
          settings: { privacyLevel: "private" },
        },
        user: { id: "user-123" },
      };
    });

    it("should create a family and add creator as admin", async () => {
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
      await familyController.createFamily(req, res);

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
      // Set up request with missing name
      req.body = {
        description: "Test Description",
      };

      await familyController.createFamily(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Please provide a family name",
      });
      expect(Family.create).not.toHaveBeenCalled();
    });

    it("should handle server errors", async () => {
      // Mock the error
      const error = new Error("Database error");
      Family.create.mockRejectedValue(error);

      await familyController.createFamily(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
      });
    });
  });

  describe("getUserFamilies", () => {
    beforeEach(() => {
      req = {
        user: { id: "user-123" },
      };
    });

    it("should get all families for the user", async () => {
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
      await familyController.getUserFamilies(req, res);

      // Assertions
      expect(sequelize.query).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        families: mockFamilies,
      });
    });

    it("should handle empty results", async () => {
      // Mock empty results
      sequelize.query.mockResolvedValue([[]]);

      // Call the function
      await familyController.getUserFamilies(req, res);

      // Assertions
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        families: [],
      });
    });

    it("should handle server errors", async () => {
      // Mock database error
      const error = new Error("Database error");
      sequelize.query.mockRejectedValue(error);

      // Call the function
      await familyController.getUserFamilies(req, res);

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
    beforeEach(() => {
      req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
      };
    });

    it("should return a family by id if user is a member", async () => {
      // Mock family data
      const family = {
        id: "family-123",
        name: "Test Family",
        description: "Test Description",
        members: [{ userId: "user-123", role: "admin" }],
      };

      // Set up mock implementations in the correct order
      // Make sure all mocks are fully resolved before they're needed

      // 1. Mock Family.findByPk to return the family first
      Family.findByPk.mockResolvedValue(family);

      // 2. Then mock FamilyMember.findOne to indicate user is a member
      const membership = {
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
        permissions: ["view", "edit", "delete", "invite"],
      };
      FamilyMember.findOne.mockResolvedValue(membership);

      // Call the function
      await familyController.getFamilyById(req, res);

      // Assertions
      expect(Family.findByPk).toHaveBeenCalled();
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
      req.user.id = "user-456"; // Different user

      // Mock family exists
      const family = {
        id: "family-123",
        name: "Test Family",
      };
      Family.findByPk.mockResolvedValue(family);

      // Mock user is not a member
      FamilyMember.findOne.mockResolvedValue(null);

      // Call the function
      await familyController.getFamilyById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Not authorized to access this family",
      });
    });

    it("should return 404 if family is not found", async () => {
      // Mock family not found
      Family.findByPk.mockResolvedValue(null);

      // Call the function
      await familyController.getFamilyById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Family not found",
      });
    });

    it("should handle server errors", async () => {
      // Mock database error
      const error = new Error("Database error");
      Family.findByPk.mockRejectedValue(error);

      // Call the function
      await familyController.getFamilyById(req, res);

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
    beforeEach(() => {
      req = {
        params: { id: "family-123" },
        user: { id: "user-123" },
        body: {
          name: "Updated Family Name",
          description: "Updated Description",
        },
      };
    });

    it("should update a family if user is an admin", async () => {
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
      await familyController.updateFamily(req, res);

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

  describe("removeFamilyMember", () => {
    beforeEach(() => {
      req = {
        params: {
          id: "family-123",
          userId: "user-456",
        },
        user: { id: "user-123" },
      };
    });

    it("should remove a member from the family", async () => {
      // Mock admin membership check
      const adminMembership = {
        id: "member-123",
        familyId: "family-123",
        userId: "user-123",
        role: "admin",
      };
      FamilyMember.findOne.mockResolvedValueOnce(adminMembership);

      // Mock member to remove
      const memberToRemove = {
        id: "member-456",
        familyId: "family-123",
        userId: "user-456",
        role: "member",
        destroy: jest.fn().mockResolvedValue(true),
      };
      FamilyMember.findOne.mockResolvedValueOnce(memberToRemove);

      // Mock family
      const family = {
        id: "family-123",
        createdBy: "user-789", // Different from both users
      };
      Family.findByPk.mockResolvedValue(family);

      // Call the function
      await familyController.removeFamilyMember(req, res);

      // Assertions
      expect(memberToRemove.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Member removed successfully",
      });
    });
  });

  describe("deleteFamily", () => {
    beforeEach(() => {
      req = {
        params: { id: "family-123" },
        user: { id: "user-creator" },
      };
    });

    it("should delete a family if user is the creator", async () => {
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
      await familyController.deleteFamily(req, res);

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
