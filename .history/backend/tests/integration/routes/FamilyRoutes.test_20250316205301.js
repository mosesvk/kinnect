// tests/integration/routes/FamilyRoutes.test.js
const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { sequelize } = require("../../../src/config/db");
const Family = require("../../../src/models/Family");
const FamilyMember = require("../../../src/models/FamilyMember");
const User = require("../../../src/models/User");
const familyRoutes = require("../../../src/routes/familyRoutes");
const { protect } = require("../../../src/middleware/auth");

// Fix the auth middleware mock to properly implement admin checking
jest.mock("../../../src/middleware/auth", () => ({
  protect: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      // Extract user ID from authorization header for testing
      const userId = req.headers.authorization.split(" ")[1];
      req.user = {
        id: userId,
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

    // Here's the critical part - fix the FamilyMember.findOne mock implementation
    FamilyMember.findOne.mockImplementation(({ where }) => {
      // For admin permission check
      if (where.familyId === "family-123" && where.userId === "user-123" && where.role === "admin") {
        return Promise.resolve({
          id: "member-123",
          familyId: "family-123",
          userId: "user-123",
          role: "admin",
          permissions: ["view", "edit", "delete", "invite"]
        });
      }
      
      // For non-admin permission check
      if (where.familyId === "family-123" && where.userId === "user-456" && where.role === "admin") {
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

  // Tests for PUT /api/families/:id
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
      // Ensure the FamilyMember.findOne mock returns null for user-456 as admin
      FamilyMember.findOne.mockImplementation(({ where }) => {
        if (where.familyId === "family-123" && where.userId === "user-456" && where.role === "admin") {
          return Promise.resolve(null); // Not an admin
        }
        return Promise.resolve({
          id: "member-456",
          familyId: "family-123",
          userId: "user-456",
          role: "member",
          permissions: ["view"]
        });
      });

      const response = await request(app)
        .put("/api/families/family-123")
        .set("Authorization", "Bearer user-456")
        .send({ name: "Updated Family Name" });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  // Other test sections remain unchanged
});