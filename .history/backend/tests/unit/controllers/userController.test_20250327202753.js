// tests/unit/controllers/userController.test.js

// Mock dependencies
jest.mock("../../../src/models/User", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

// Import controller and models
const User = require("../../../src/models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userController = require("../../../src/controllers/userController");

describe("User Controller Unit Tests", () => {
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
        passwordHash: "password123", // Note: In the actual implementation this would be hashed
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

    test("returns 401 if password does not match", async () => {
      // Set up request
      const req = {
        body: {
          email: "test@example.com",
          password: "wrongpassword",
        },
      };

      // Mock user found but password doesn't match
      const mockUser = {
        id: "user123",
        email: "test@example.com",
        passwordHash: "hashedpassword",
      };

      User.findOne.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(false);

      // Call the controller
      await userController.loginUser(req, res);

      // Assertions
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "wrongpassword",
        "hashedpassword"
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    test("returns 401 if user is not found", async () => {
      // Set up request
      const req = {
        body: {
          email: "nonexistent@example.com",
          password: "password123",
        },
      };

      // Mock user not found
      User.findOne.mockResolvedValueOnce(null);

      // Call the controller
      await userController.loginUser(req, res);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: "nonexistent@example.com" },
      });

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    test("returns 400 if email or password is missing", async () => {
      // Set up request with missing password
      const req = {
        body: {
          email: "test@example.com",
          // Missing password
        },
      };

      // Call the controller
      await userController.loginUser(req, res);

      // Assertions
      expect(User.findOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Please provide email and password",
      });
    });
  });

  describe("getUserProfile", () => {
    test("gets user profile successfully", async () => {
      // Set up request with user set by auth middleware
      const req = {
        user: { id: "user123" },
      };

      // Mock user found
      const mockUser = {
        id: "user123",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        role: "user",
      };

      User.findByPk.mockResolvedValueOnce(mockUser);

      // Call the controller
      await userController.getUserProfile(req, res);

      // Assertions
      expect(User.findByPk).toHaveBeenCalledWith("user123", {
        attributes: { exclude: ["passwordHash"] },
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: mockUser,
      });
    });

    test("returns 404 if user is not found", async () => {
      // Set up request
      const req = {
        user: { id: "nonexistent-user" },
      };

      // Mock user not found
      User.findByPk.mockResolvedValueOnce(null);

      // Call the controller
      await userController.getUserProfile(req, res);

      // Assertions
      expect(User.findByPk).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });
  });

  describe("updateUserProfile", () => {
    test("updates user profile successfully", async () => {
      // Set up request
      const req = {
        user: { id: "user123" },
        body: {
          firstName: "Updated",
          lastName: "User",
          email: "updated@example.com",
        },
      };

      // Mock user found and updated
      const mockUser = {
        id: "user123",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        save: jest.fn().mockResolvedValue({
          id: "user123",
          firstName: "Updated",
          lastName: "User",
          email: "updated@example.com",
        }),
      };

      User.findByPk.mockResolvedValueOnce(mockUser);

      // Call the controller
      await userController.updateUserProfile(req, res);

      // Assertions
      expect(User.findByPk).toHaveBeenCalledWith("user123");
      expect(mockUser.firstName).toBe("Updated");
      expect(mockUser.email).toBe("updated@example.com");
      expect(mockUser.save).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          firstName: "Updated",
          lastName: "User",
          email: "updated@example.com",
          token: "test-token",
        }),
      });
    });

    test("updates password if provided", async () => {
      // Set up request with password
      const req = {
        user: { id: "user123" },
        body: {
          password: "newpassword",
        },
      };

      // Mock user found and updated
      const mockUser = {
        id: "user123",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "oldhash",
        save: jest.fn().mockResolvedValue({
          id: "user123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        }),
      };

      User.findByPk.mockResolvedValueOnce(mockUser);

      // Call the controller
      await userController.updateUserProfile(req, res);

      // Assertions
      expect(mockUser.passwordHash).toBe("newpassword"); // Note: In real implementation this would be hashed
      expect(mockUser.save).toHaveBeenCalled();
    });

    test("returns 404 if user is not found", async () => {
      // Set up request
      const req = {
        user: { id: "nonexistent-user" },
        body: {
          firstName: "Updated",
        },
      };

      // Mock user not found
      User.findByPk.mockResolvedValueOnce(null);

      // Call the controller
      await userController.updateUserProfile(req, res);

      // Assertions
      expect(User.findByPk).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });
  });

  describe("getAllUsers", () => {
    test("gets all users successfully", async () => {
      // Set up request with user set by auth middleware (admin check would be in middleware)
      const req = {
        user: { id: "admin-user", role: "admin" },
      };

      // Mock users found
      const mockUsers = [
        {
          id: "user1",
          firstName: "Test1",
          lastName: "User1",
          email: "test1@example.com",
        },
        {
          id: "user2",
          firstName: "Test2",
          lastName: "User2",
          email: "test2@example.com",
        },
      ];

      User.findAll.mockResolvedValueOnce(mockUsers);

      // Call the controller
      await userController.getAllUsers(req, res);

      // Assertions
      expect(User.findAll).toHaveBeenCalledWith({
        attributes: { exclude: ["passwordHash"] },
      });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        users: mockUsers,
      });
    });
  });

  describe('deleteUserProfile', () => {
    // Add missing mocks
    beforeEach(() => {
      // Mocking sequelize for transaction
      global.sequelize = {
        transaction: jest.fn().mockImplementation(() => ({
          commit: jest.fn().mockResolvedValue(),
          rollback: jest.fn().mockResolvedValue()
        }))
      };
  
      // Mock FamilyMember, Family, and other models
      jest.mock('../../../src/models/FamilyMember', () => ({
        findAll: jest.fn().mockResolvedValue([]),
        destroy: jest.fn().mockResolvedValue(1)
      }));
  
      jest.mock('../../../src/models/Family', () => ({
        findAll: jest.fn().mockResolvedValue([])
      }));
  
      jest.mock('../../../src/models/EventAttendee', () => ({
        destroy: jest.fn().mockResolvedValue(1)
      }));
  
      jest.mock('../../../src/models/Like', () => ({
        destroy: jest.fn().mockResolvedValue(1)
      }));
  
      jest.mock('../../../src/models/Comment', () => ({
        destroy: jest.fn().mockResolvedValue(1)
      }));
  
      jest.mock('../../../src/models/Post', () => ({
        findAll: jest.fn().mockResolvedValue([])
      }));
  
      jest.mock('../../../src/models/PostFamily', () => ({
        destroy: jest.fn().mockResolvedValue(1)
      }));
  
      jest.mock('../../../src/models/PostEvent', () => ({
        destroy: jest.fn().mockResolvedValue(1)
      }));
  
      jest.mock('../../../src/models/Media', () => ({
        findAll: jest.fn().mockResolvedValue([])
      }));
  
      // Mock file deletion
      jest.mock('../../../src/services/fileUpload', () => ({
        deleteFile: jest.fn().mockResolvedValue(true)
      }));
  
      // Reset mocks
      jest.clearAllMocks();
    });
  
    test('successfully deletes user profile', async () => {
      // Set up request with user set by auth middleware
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
        passwordHash: 'hashed_password',
        destroy: jest.fn().mockResolvedValue(true),
        matchPassword: jest.fn().mockResolvedValue(true)
      };
  
      User.findByPk.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(true);
  
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
  
    test('returns 401 if password is incorrect', async () => {
      // Set up request with user set by auth middleware
      const req = {
        user: { id: 'user123' },
        body: { password: 'wrongPassword' }
      };
      
      // Mock user found
      const mockUser = {
        id: 'user123',
        passwordHash: 'hashed_password',
        matchPassword: jest.fn().mockResolvedValue(false)
      };
  
      User.findByPk.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(false);
  
      // Call the controller
      await userController.deleteUserProfile(req, res);
  
      // Assertions
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid password'
      });
      expect(sequelize.transaction).not.toHaveBeenCalled();
    });
  
    test('returns 404 if user is not found', async () => {
      // Set up request with user set by auth middleware
      const req = {
        user: { id: 'nonexistent' },
        body: { password: 'password123' }
      };
      
      // Mock user not found
      User.findByPk.mockResolvedValueOnce(null);
  
      // Call the controller
      await userController.deleteUserProfile(req, res);
  
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
      expect(sequelize.transaction).not.toHaveBeenCalled();
    });
  
    test('handles family reassignment when user is a creator', async () => {
      // Set up request
      const req = {
        user: { id: 'user123' },
        body: { password: 'correctPassword' }
      };
      
      // Mock transaction
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue()
      };
      sequelize.transaction.mockResolvedValueOnce(mockTransaction);
      
      // Mock user found
      const mockUser = {
        id: 'user123',
        passwordHash: 'hashed_password',
        matchPassword: jest.fn().mockResolvedValue(true),
        destroy: jest.fn().mockResolvedValue(true)
      };
  
      User.findByPk.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(true);
      
      // Mock family created by user
      const mockFamily = {
        id: 'family123',
        createdBy: 'user123',
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock finding alternate admin
      const mockAdminMember = {
        userId: 'admin456',
        role: 'admin'
      };
      
      // Setup mocks for complex query chain
      const FamilyMember = require('../../../src/models/FamilyMember');
      const Family = require('../../../src/models/Family');
      
      Family.findAll.mockResolvedValueOnce([mockFamily]);
      FamilyMember.findOne.mockResolvedValueOnce(mockAdminMember);
  
      // Call the controller
      await userController.deleteUserProfile(req, res);
  
      // Assertions
      expect(Family.findAll).toHaveBeenCalledWith({
        where: { createdBy: 'user123' },
        transaction: mockTransaction
      });
      
      expect(FamilyMember.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          familyId: 'family123',
          role: 'admin'
        })
      }));
      
      expect(mockFamily.save).toHaveBeenCalled();
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: expect.stringContaining('deleted')
      });
    });
  
    test('handles error during deletion with transaction rollback', async () => {
      // Set up request
      const req = {
        user: { id: 'user123' },
        body: { password: 'correctPassword' }
      };
      
      // Mock transaction
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue()
      };
      sequelize.transaction.mockResolvedValueOnce(mockTransaction);
      
      // Mock user found but error during delete
      const mockUser = {
        id: 'user123',
        passwordHash: 'hashed_password',
        matchPassword: jest.fn().mockResolvedValue(true),
        destroy: jest.fn().mockRejectedValue(new Error('Database error'))
      };
  
      User.findByPk.mockResolvedValueOnce(mockUser);
      bcrypt.compare.mockResolvedValueOnce(true);
      
      // Mock finding user's data
      const FamilyMember = require('../../../src/models/FamilyMember');
      FamilyMember.findAll.mockResolvedValueOnce([]);
      
      const Family = require('../../../src/models/Family');
      Family.findAll.mockResolvedValueOnce([]);
  
      // Call the controller
      await userController.deleteUserProfile(req, res);
  
      // Assertions
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
        error: expect.any(String)
      });
    });
  });
});
