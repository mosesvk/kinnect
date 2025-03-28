// tests/unit/controllers/userController.test.js - Fixed version

// Mock dependencies
jest.mock("../../../src/models/User", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue("salt"),
  hash: jest.fn().mockResolvedValue("hashedpassword"),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("test-token"),
}));

// Mock sequelize for transaction
jest.mock("../../../src/config/db", () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null),
    })),
  },
}));

// Mock other models needed for user deletion
jest.mock("../../../src/models/FamilyMember", () => ({
  findAll: jest.fn().mockResolvedValue([]),
  destroy: jest.fn().mockResolvedValue(1),
}));

jest.mock("../../../src/models/Family", () => ({
  findAll: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../../src/models/EventAttendee", () => ({
  destroy: jest.fn().mockResolvedValue(1),
}));

jest.mock("../../../src/models/Like", () => ({
  destroy: jest.fn().mockResolvedValue(1),
}));

jest.mock("../../../src/models/Comment", () => ({
  destroy: jest.fn().mockResolvedValue(1),
}));

jest.mock("../../../src/models/Post", () => ({
  findAll: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../../src/models/PostFamily", () => ({
  destroy: jest.fn().mockResolvedValue(1),
}));

jest.mock("../../../src/models/PostEvent", () => ({
  destroy: jest.fn().mockResolvedValue(1),
}));

jest.mock("../../../src/models/Media", () => ({
  findAll: jest.fn().mockResolvedValue([]),
}));

// Import controller and models
const User = require("../../../src/models/User");
const FamilyMember = require("../../../src/models/FamilyMember");
const Family = require("../../../src/models/Family");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sequelize } = require("../../../src/config/db");
const userController = require("../../../src/controllers/userController");

describe("User Controller Unit Tests", () => {
  // Create a standard response mock
  let res;
  let mockTransaction;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a fresh response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock transaction
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null),
    };
    sequelize.transaction.mockReturnValue(mockTransaction);

    // Mock JWT token generation
    jwt.sign.mockReturnValue("test-token");
  });

  describe("registerUser", () => {
    test("registers a user successfully", async () => {
      // Set up request
      const req = {
        body: {
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          password: "password123",
        },
      };
    
      // Mock user not existing yet
      User.findOne.mockResolvedValueOnce(null);
    
      // Mock user creation
      const mockCreatedUser = {
        id: "user123",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashedpassword",
      };
    
      User.create.mockResolvedValueOnce(mockCreatedUser);
    
      // Call the controller
      await userController.registerUser(req, res);
    
      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    
      expect(User.create).toHaveBeenCalledWith({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "password123", // In real implementation this would be hashed
      });
    
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: "user123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          token: "test-token",
        }),
      });
    });

    test("returns 400 if user already exists", async () => {
      // Set up request
      const req = {
        body: {
          firstName: "Test",
          lastName: "User",
          email: "existing@example.com",
          password: "password123",
        },
      };

      // Mock user already existing
      User.findOne.mockResolvedValueOnce({
        id: "existing-user",
        email: "existing@example.com",
      });

      // Call the controller
      await userController.registerUser(req, res);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: "existing@example.com" },
      });

      expect(User.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User already exists",
      });
    });

    test("returns 400 if required fields are missing", async () => {
      // Set up request with missing fields
      const req = {
        body: {
          email: "test@example.com",
          // Missing firstName, lastName, password
        },
      };

      // Call the controller
      await userController.registerUser(req, res);

      // Assertions
      expect(User.findOne).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Please provide all required fields",
      });
    });

    test("handles server error gracefully", async () => {
      // Set up request
      const req = {
        body: {
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          password: "password123",
        },
      };

      // Mock database error
      User.findOne.mockRejectedValueOnce(new Error("Database error"));

      // Call the controller
      await userController.registerUser(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error",
        error: "Database error",
      });
    });
  });

  describe("loginUser", () => {
    test("logs in a user successfully", async () => {
      // Set up request
      const req = {
        body: {
          email: "test@example.com",
          password: "password123",
        },
      };
    
      // Mock user found
      const mockUser = {
        id: "user123",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        matchPassword: jest.fn().mockResolvedValue(true),
        generateToken: jest.fn().mockReturnValue("test-token"),
      };
    
      User.findOne.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(true);
    
      // Call the controller
      await userController.loginUser(req, res);
    
      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedpassword"
      );
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: "user123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          token: "test-token",
        }),
      });
    });
    
    // Add more tests for loginUser, getUserProfile, updateUserProfile, etc.
  });

  describe("deleteUserProfile", () => {
    test("successfully deletes user profile", async () => {
      // Set up request
      const req = {
        user: { id: 'user123' },
        body: { password: 'correctPassword' }
      };
      
      // Mock user found with destroy method
      const mockUser = {
        id: 'user123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        destroy: jest.fn().mockResolvedValue(true),
        matchPassword: jest.fn().mockResolvedValue(true)
      };
  
      User.findByPk.mockResolvedValueOnce(mockUser);
  
      // Call the controller
      await userController.deleteUserProfile(req, res);
  
      // Assertions
      expect(User.findByPk).toHaveBeenCalledWith('user123');
      expect(mockUser.matchPassword).toHaveBeenCalledWith('correctPassword');
      expect(sequelize.transaction).toHaveBeenCalled();
      expect(mockUser.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('deleted')
      });
    });
    
    // Add more tests for deleteUserProfile
  });
});