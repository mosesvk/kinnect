// tests/integration/routes/familyRoutes.test.js
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { sequelize } = require("../../../src/config/db");
const Family = require("../../../src/models/Family");
const FamilyMember = require("../../../src/models/FamilyMember");
const User = require("../../../src/models/User");
const familyRoutes = require("../../../src/routes/familyRoutes");
const { protect } = require("../../../src/middleware/auth");

// Mock the auth middleware to avoid actual token validation
jest.mock("../../../src/middleware/auth", () => ({
  protect: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      req.user = {
        id: req.headers.authorization.split(" ")[1], // Using token as user ID for test simplicity
      };
      next();
    } else {
      res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }
  }),
}));

// Create express app for testing
const app = express();
app.use(express.json());
app.use("/api/families", familyRoutes);

describe("Family API Integration Tests", () => {
  // Test data
  const testUsers = [
    {
      id: "user-123",
      email: "test1@example.com",
      firstName: "Test",
      lastName: "User1",
      passwordHash: "hashedPassword",
    },
    {
      id: "user-456",
      email: "test2@example.com",
      firstName: "Test",
      lastName: "User2",
      passwordHash: "hashedPassword",
    },
  ];

  const testFamilies = [
    {
      id: "family-123",
      name: "Test Family 1",
      description: "Family for testing",
      createdBy: "user-123",
      settings: { privacyLevel: "private" },
    },
  ];

  const testFamilyMembers = [
    {
      id: "member-123",
      familyId: "family-123",
      userId: "user-123",
      role: "admin",
      permissions: ["view", "edit", "delete", "invite"],
    },
  ];

  // Setup and teardown
  beforeAll(async () => {
    // Mock sequelize methods
    sequelize.sync = jest.fn().mockResolvedValue();

    // Mock models
    User.findByPk = jest.fn();
    User.findOne = jest.fn();
    Family.create = jest.fn();
    Family.findByPk = jest.fn();
    Family.findAll = jest.fn();
    FamilyMember.create = jest.fn();
    FamilyMember.findOne = jest.fn();
    FamilyMember.findAll = jest.fn();
    FamilyMember.destroy = jest.fn();

    // Mock sequelize query
    sequelize.query = jest.fn();

    // Setup mock implementation defaults
    User.findByPk.mockImplementation((id) => {
      const user = testUsers.find((u) => u.id === id);
      return Promise.resolve(user || null);
    });

    User.findOne.mockImplementation(({ where }) => {
      const user = testUsers.find((u) => u.email === where.email);
      return Promise.resolve(user || null);
    });

    Family.findByPk.mockImplementation((id) => {
      const family = testFamilies.find((f) => f.id === id);
      return Promise.resolve(family || null);
    });

    FamilyMember.findOne.mockImplementation(({ where }) => {
      // For admin permission check (specific to updating families)
      if (where.familyId === 'family-123' && where.userId === 'user-123' && where.role === 'admin') {
        return Promise.resolve({
          role: 'admin',
          familyId: 'family-123',
          userId: 'user-123'
        });
      }
      
      // For regular member role check (user-456 updating test)
      if (where.familyId === 'family-123' && where.userId === 'user-456' && where.role === 'admin') {
        return Promise.resolve(null); // Not an admin
      }
      
      // For general membership check
      if (where.familyId && where.userId) {
        const member = testFamilyMembers.find(
          (m) => m.familyId === where.familyId && m.userId === where.userId
        );
        return Promise.resolve(member || null);
      }
      
      return Promise.resolve(null);
    });

    sequelize.query.mockImplementation((query, options) => {
      // Simple mock for the getUserFamilies query
      if (query.includes("SELECT") && options.replacements.userId) {
        const userFamilies = testFamilies.filter((f) => {
          const isMember = testFamilyMembers.some(
            (m) =>
              m.familyId === f.id && m.userId === options.replacements.userId
          );
          return isMember;
        });

        return Promise.resolve([userFamilies]);
      }
      return Promise.resolve([]);
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Tests
  describe("POST /api/families", () => {
    it("should create a new family", async () => {
      // Mock Family.create to return a new family
      const newFamily = {
        id: "family-456",
        name: "New Test Family",
        description: "New family for testing",
        createdBy: "user-123",
      };

      Family.create.mockResolvedValue(newFamily);
      FamilyMember.create.mockResolvedValue({
        id: "member-456",
        familyId: "family-456",
        userId: "user-123",
        role: "admin",
      });

      const response = await request(app)
        .post("/api/families")
        .set("Authorization", "Bearer user-123")
        .send({
          name: "New Test Family",
          description: "New family for testing",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.family).toEqual(newFamily);
      expect(Family.create).toHaveBeenCalledWith({
        name: "New Test Family",
        description: "New family for testing",
        settings: undefined,
        createdBy: "user-123",
      });
      expect(FamilyMember.create).toHaveBeenCalledWith({
        familyId: "family-456",
        userId: "user-123",
        role: "admin",
        permissions: ["view", "edit", "delete", "invite"],
      });
    });

    it("should return 400 if name is not provided", async () => {
      const response = await request(app)
        .post("/api/families")
        .set("Authorization", "Bearer user-123")
        .send({
          description: "New family for testing",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(Family.create).not.toHaveBeenCalled();
    });

    it("should return 401 if no token is provided", async () => {
      const response = await request(app).post("/api/families").send({
        name: "New Test Family",
        description: "New family for testing",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/families/:id", () => {
    it("should return a family by id if user is a member", async () => {
      const family = {
        ...testFamilies[0],
        members: [
          {
            User: {
              id: "user-123",
              firstName: "Test",
              lastName: "User1",
              email: "test1@example.com",
            },
          },
        ],
      };

      Family.findByPk.mockResolvedValue(family);

      const response = await request(app)
        .get("/api/families/family-123")
        .set("Authorization", "Bearer user-123");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.family).toEqual(family);
      expect(response.body.userRole).toBe("admin");
    });

    it("should return 403 if user is not a member of the family", async () => {
      FamilyMember.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/families/family-123")
        .set("Authorization", "Bearer user-456");

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/families/:id", () => {
    it("should update a family if user is an admin", async () => {
      // Create an updated family object
      const updatedFamily = {
        ...testFamilies[0],
        name: "Updated Family Name",
        save: jest.fn().mockResolvedValue(true),
      };

      Family.findByPk.mockResolvedValue(updatedFamily);

      const response = await request(app)
        .put("/api/families/family-123")
        .set("Authorization", "Bearer user-123")
        .send({ name: "Updated Family Name" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(updatedFamily.save).toHaveBeenCalled();
    });

    it("should return 403 if user is not an admin of the family", async () => {
      // Mock a regular member without admin role
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "member",
      });

      const response = await request(app)
        .put("/api/families/family-123")
        .set("Authorization", "Bearer user-456")
        .send({ name: "Updated Family Name" });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/families/:id/members", () => {
    it("should add a member to the family", async () => {
      // Mock an admin membership
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock finding a user by email
      User.findOne.mockResolvedValueOnce(testUsers[1]);

      // Mock existing membership check (should return null to indicate no existing membership)
      FamilyMember.findOne.mockResolvedValueOnce(null);

      // Mock create new membership
      const newMembership = {
        id: "member-789",
        familyId: "family-123",
        userId: "user-456",
        role: "member",
        permissions: ["view"],
      };

      FamilyMember.create.mockResolvedValueOnce(newMembership);

      const response = await request(app)
        .post("/api/families/family-123/members")
        .set("Authorization", "Bearer user-123")
        .send({ email: "test2@example.com" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.membership).toEqual(newMembership);
      expect(FamilyMember.create).toHaveBeenCalledWith({
        familyId: "family-123",
        userId: "user-456",
        role: "member",
        permissions: ["view"],
      });
    });

    it("should return 403 if user is not an admin of the family", async () => {
      // Mock a regular membership without admin role
      FamilyMember.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/families/family-123/members")
        .set("Authorization", "Bearer user-456")
        .send({ email: "test3@example.com" });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/families/:id/members/:userId", () => {
    it("should remove a member from the family", async () => {
      // Mock an admin membership
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock finding the membership to remove
      FamilyMember.findOne.mockResolvedValueOnce({
        userId: "user-456",
        familyId: "family-123",
        role: "member",
        destroy: jest.fn().mockResolvedValue(true),
      });

      // Mock the family
      Family.findByPk.mockResolvedValueOnce({
        createdBy: "user-123", // Different from the user being removed
      });

      const response = await request(app)
        .delete("/api/families/family-123/members/user-456")
        .set("Authorization", "Bearer user-123");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should not allow removing the family creator", async () => {
      // Mock an admin membership
      FamilyMember.findOne.mockResolvedValueOnce({
        role: "admin",
      });

      // Mock finding the membership to remove
      FamilyMember.findOne.mockResolvedValueOnce({
        userId: "user-123",
        familyId: "family-123",
        role: "admin",
      });

      // Mock the family where the user to remove is the creator
      Family.findByPk.mockResolvedValueOnce({
        createdBy: "user-123",
      });

      const response = await request(app)
        .delete("/api/families/family-123/members/user-123")
        .set("Authorization", "Bearer user-123");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Cannot remove the family creator");
    });
  });

  describe("DELETE /api/families/:id", () => {
    it("should delete a family if user is the creator", async () => {
      // Mock the family
      const mockFamily = {
        id: "family-123",
        createdBy: "user-123",
        destroy: jest.fn().mockResolvedValue(true),
      };

      Family.findByPk.mockResolvedValueOnce(mockFamily);

      // Mock membership deletion
      FamilyMember.destroy.mockResolvedValueOnce(true);

      const response = await request(app)
        .delete("/api/families/family-123")
        .set("Authorization", "Bearer user-123");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(FamilyMember.destroy).toHaveBeenCalledWith({
        where: { familyId: "family-123" },
      });
      expect(mockFamily.destroy).toHaveBeenCalled();
    });

    it("should return 403 if user is not the creator of the family", async () => {
      // Mock the family with a different creator
      Family.findByPk.mockResolvedValueOnce({
        id: "family-123",
        createdBy: "user-123",
      });

      const response = await request(app)
        .delete("/api/families/family-123")
        .set("Authorization", "Bearer user-456");

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Only the family creator can delete it"
      );
    });
  });
});
