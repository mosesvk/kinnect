// tests/integration/api/userEndpoints.test.js

// First import the modules we need
const request = require("supertest");

// Define a mock sequelize for testing
const mockSequelize = {
  define: jest.fn().mockReturnValue({}),
  authenticate: jest.fn().mockResolvedValue(),
  transaction: jest.fn().mockImplementation(() => ({
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
  })),
  close: jest.fn().mockResolvedValue(),
  QueryTypes: {
    SELECT: "SELECT",
  },
  query: jest.fn().mockResolvedValue([[]]),
};

// Mock the db module first, before any models are loaded
jest.mock("../../../src/config/db", () => ({
  sequelize: mockSequelize,
  connectDB: jest.fn().mockResolvedValue(),
}));

// Define constants outside the mock
const mockUserUUID = "12345678-1234-1234-1234-123456789012";

// Create mock functions for bcrypt that we can control in tests
const mockCompare = jest.fn().mockImplementation((password, hash) => {
  // By default return true except for "wrongpassword"
  return Promise.resolve(password !== "wrongpassword");
});

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  compare: mockCompare,
  hash: jest.fn().mockResolvedValue("hashedPassword"),
  genSalt: jest.fn().mockResolvedValue("salt"),
}));

// Now mock the User model
jest.mock("../../../src/models/User", () => {
  return {
    findOne: jest.fn().mockImplementation((options) => {
      if (
        options &&
        options.where &&
        options.where.email === "special@example.com"
      ) {
        return Promise.resolve({
          id: "12345678-1234-1234-1234-123456789012",
          firstName: "Special",
          lastName: "TestUser",
          email: "special@example.com",
          passwordHash: "hashedPassword",
          role: "user",
          matchPassword: async (password) => {
            // Use the mock to determine if password matches
            return await mockCompare(password, "hashedPassword");
          },
          generateToken: jest.fn().mockReturnValue("test-token"),
        });
      } else if (
        options &&
        options.where &&
        options.where.email === "existing@example.com"
      ) {
        return Promise.resolve({
          id: "existing-id",
          email: "existing@example.com",
        });
      }
      return Promise.resolve(null);
    }),
    findByPk: jest.fn().mockImplementation((id) => {
      if (id === "12345678-1234-1234-1234-123456789012") {
        return Promise.resolve({
          id: "12345678-1234-1234-1234-123456789012",
          firstName: "Special",
          lastName: "TestUser",
          email: "special@example.com",
          passwordHash: "hashedPassword",
          role: "user",
          save: jest.fn().mockImplementation(function () {
            return Promise.resolve(this);
          }),
          toJSON: jest.fn().mockReturnValue({
            id: "12345678-1234-1234-1234-123456789012",
            firstName: "Special",
            lastName: "TestUser",
            email: "special@example.com",
          }),
        });
      }
      return Promise.resolve(null);
    }),
    findAll: jest.fn().mockResolvedValue([
      {
        id: "12345678-1234-1234-1234-123456789012",
        firstName: "Special",
        lastName: "TestUser",
        email: "special@example.com",
      },
    ]),
    create: jest.fn().mockImplementation((userData) => {
      return Promise.resolve({
        id: "new-user-id",
        ...userData,
        toJSON: () => ({
          id: "new-user-id",
          ...userData,
        }),
      });
    }),
  };
});

// Mock additional models to avoid sequelize errors
jest.mock("../../../src/models/Family", () => ({}));
jest.mock("../../../src/models/FamilyMember", () => ({}));
jest.mock("../../../src/models/Event", () => ({}));
jest.mock("../../../src/models/EventAttendee", () => ({}));
jest.mock("../../../src/models/Post", () => ({}));
jest.mock("../../../src/models/PostFamily", () => ({}));
jest.mock("../../../src/models/PostEvent", () => ({}));
jest.mock("../../../src/models/Comment", () => ({}));
jest.mock("../../../src/models/Like", () => ({}));
jest.mock("../../../src/models/Media", () => ({}));
jest.mock("../../../src/models/Index", () => ({
  User: require("../../../src/models/User"),
  Family: require("../../../src/models/Family"),
  FamilyMember: require("../../../src/models/FamilyMember"),
  Event: require("../../../src/models/Event"),
  EventAttendee: require("../../../src/models/EventAttendee"),
  Post: require("../../../src/models/Post"),
  PostFamily: require("../../../src/models/PostFamily"),
  PostEvent: require("../../../src/models/PostEvent"),
  Comment: require("../../../src/models/Comment"),
  Like: require("../../../src/models/Like"),
  Media: require("../../../src/models/Media"),
  syncDatabase: jest.fn().mockResolvedValue(),
}));

// Mock jwt
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("test-token"),
  verify: jest
    .fn()
    .mockReturnValue({ id: "12345678-1234-1234-1234-123456789012" }),
}));

// Mock the auth middleware
jest.mock("../../../src/middleware/auth", () => ({
  protect: jest.fn((req, res, next) => {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      req.user = {
        id: "12345678-1234-1234-1234-123456789012",
        role: "user",
      };
      next();
    } else {
      res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }
  }),
  admin: jest.fn((req, res, next) => {
    next();
  }),
}));

// Import the app after all mocks are set up
const app = require("../../../src/server");

jest.setTimeout(30000);

describe("User API Endpoints", () => {
  beforeAll(() => {
    console.log("Test setup completed successfully");
  });

  afterAll(() => {
    console.log("Test cleanup completed successfully");
  });

  describe("POST /api/users/register", () => {
    it("should register a new user", async () => {
      const response = await request(app).post("/api/users/register").send({
        firstName: "New",
        lastName: "User",
        email: "newuser@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("token");
      expect(response.body.user.firstName).toBe("New");
      expect(response.body.user.lastName).toBe("User");
    });

    it("should return 400 if email already exists", async () => {
      const response = await request(app).post("/api/users/register").send({
        firstName: "Duplicate",
        lastName: "User",
        email: "existing@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already exists");
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app).post("/api/users/register").send({
        firstName: "Incomplete",
        // Missing lastName, email, and password
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("required fields");
    });
  });

  describe("POST /api/users/login", () => {
    it("should login successfully with correct credentials", async () => {
      const response = await request(app).post("/api/users/login").send({
        email: "special@example.com",
        password: "test123", // This should match
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty("token");
    });

    it("should return 401 with incorrect password", async () => {
      const response = await request(app).post("/api/users/login").send({
        email: "special@example.com",
        password: "wrongpassword", // This should fail in our mock
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid email or password");
    });

    it("should return 401 with non-existent email", async () => {
      const response = await request(app).post("/api/users/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid email or password");
    });

    it("should return 400 if email or password is missing", async () => {
      const response = await request(app).post("/api/users/login").send({
        // Missing both email and password
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("provide email and password");
    });
  });

  describe("GET /api/users/profile", () => {
    it("should get user profile successfully", async () => {
      const response = await request(app)
        .get("/api/users/profile")
        .set("Authorization", "Bearer any-token-will-work");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user.id).toBe(mockUserUUID);
    });

    it("should return 401 if no token provided", async () => {
      const response = await request(app).get("/api/users/profile");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Not authorized");
    });
  });

  describe("PUT /api/users/profile", () => {
    it("should update user profile successfully", async () => {
      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", "Bearer any-token-will-work")
        .send({
          firstName: "Updated",
          lastName: "TestUser",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty("token");
    });

    it("should allow updating just one field", async () => {
      const response = await request(app)
        .put("/api/users/profile")
        .set("Authorization", "Bearer any-token-will-work")
        .send({
          firstName: "JustFirstName",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty("token");
    });

    it("should return 401 if no token provided", async () => {
      const response = await request(app).put("/api/users/profile").send({
        firstName: "Unauthorized",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Not authorized");
    });
  });

  describe("GET /api/users (Admin Only)", () => {
    it("should get all users", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", "Bearer any-token-will-work");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty("users");
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it("should return 401 if no token provided", async () => {
      const response = await request(app).get("/api/users");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Not authorized");
    });
  });

  describe("DELETE /api/users/profile", () => {
    // Reset mocks before each test
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset the mockCompare to return true for valid passwords
      mockCompare.mockImplementation((password, hash) => {
        return Promise.resolve(password !== "wrongpassword");
      });
    });

    it("should delete user profile successfully with correct password", async () => {
      // Mock the transaction and related operations
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
      };
      mockSequelize.transaction.mockResolvedValue(mockTransaction);

      // Mock user exists
      const mockUser = {
        id: mockUserUUID,
        firstName: "Special",
        lastName: "TestUser",
        email: "special@example.com",
        passwordHash: "hashedPassword",
        destroy: jest.fn().mockResolvedValue(true),
      };

      // Update our findByPk mock to return a destroy function
      require("../../../src/models/User").findByPk.mockResolvedValue({
        ...mockUser,
        destroy: jest.fn().mockResolvedValue(true),
      });

      // Mock empty array for family memberships and other relationships
      const mockEmptyArray = [];

      // Mock the FamilyMember model
      const mockFamilyMember = require("../../../src/models/FamilyMember");
      mockFamilyMember.findAll = jest.fn().mockResolvedValue(mockEmptyArray);
      mockFamilyMember.destroy = jest.fn().mockResolvedValue(1);

      // Mock the Family model
      const mockFamily = require("../../../src/models/Family");
      mockFamily.findAll = jest.fn().mockResolvedValue(mockEmptyArray);

      // Mock other models as needed
      const mockModels = [
        require("../../../src/models/EventAttendee"),
        require("../../../src/models/Like"),
        require("../../../src/models/Comment"),
        require("../../../src/models/Post"),
        require("../../../src/models/PostFamily"),
        require("../../../src/models/PostEvent"),
        require("../../../src/models/Media"),
      ];

      mockModels.forEach((model) => {
        model.findAll = jest.fn().mockResolvedValue(mockEmptyArray);
        model.destroy = jest.fn().mockResolvedValue(1);
      });

      // Mock the deleteFile function if it's used
      jest.mock("../../../src/services/fileUplad", () => ({
        deleteFile: jest.fn().mockResolvedValue(true),
      }));

      const response = await request(app)
        .delete("/api/users/profile")
        .set("Authorization", "Bearer any-token-will-work")
        .send({
          password: "correctPassword",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("deleted");

      // Verify transaction was committed
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(mockTransaction.rollback).not.toHaveBeenCalled();
    });

    it("should return 401 when password is incorrect", async () => {
      // Mock password comparison to fail
      mockCompare.mockResolvedValueOnce(false);

      const response = await request(app)
        .delete("/api/users/profile")
        .set("Authorization", "Bearer any-token-will-work")
        .send({
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid password");
    });

    it("should return 400 when password is not provided", async () => {
      const response = await request(app)
        .delete("/api/users/profile")
        .set("Authorization", "Bearer any-token-will-work")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("required");
    });

    it("should return 401 if no token provided", async () => {
      const response = await request(app).delete("/api/users/profile").send({
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Not authorized");
    });

    it("should handle errors during deletion", async () => {
      // Mock transaction
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
      };
      mockSequelize.transaction.mockResolvedValue(mockTransaction);

      // Mock user exists but deletion fails
      const mockUser = {
        id: mockUserUUID,
        firstName: "Special",
        lastName: "TestUser",
        email: "special@example.com",
        passwordHash: "hashedPassword",
        destroy: jest.fn().mockRejectedValue(new Error("Database error")),
      };

      // Update our findByPk mock to return the failing destroy function
      require("../../../src/models/User").findByPk.mockResolvedValue({
        ...mockUser,
        destroy: jest.fn().mockRejectedValue(new Error("Database error")),
      });

      const response = await request(app)
        .delete("/api/users/profile")
        .set("Authorization", "Bearer any-token-will-work")
        .send({
          password: "correctPassword",
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Server error");

      // Verify transaction was rolled back
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });
});
