// tests/unit/controllers/postController.test.js - Fixed version

// Mock all dependencies first
jest.mock('../../../src/models/Post', () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
}));

jest.mock('../../../src/models/PostFamily', () => ({
  create: jest.fn(),
  bulkCreate: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../../src/models/PostEvent', () => ({
  create: jest.fn(),
  bulkCreate: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../../src/models/Family', () => ({
  findAll: jest.fn(),
}));

jest.mock('../../../src/models/FamilyMember', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
}));

jest.mock('../../../src/models/Event', () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock('../../../src/models/Comment', () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findAndCountAll: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../../src/models/Like', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  count: jest.fn(),
  destroy: jest.fn(),
}));

jest.mock('../../../src/models/User', () => ({
  findByPk: jest.fn(),
}));

jest.mock('../../../src/config/db', () => ({
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null),
    })),
    query: jest.fn(),
    QueryTypes: {
      SELECT: 'SELECT',
    },
  },
}));

// Now import the controllers and models
const Post = require('../../../src/models/Post');
const PostFamily = require('../../../src/models/PostFamily');
const PostEvent = require('../../../src/models/PostEvent');
const Family = require('../../../src/models/Family');
const FamilyMember = require('../../../src/models/FamilyMember');
const Event = require('../../../src/models/Event');
const Comment = require('../../../src/models/Comment');
const Like = require('../../../src/models/Like');
const User = require('../../../src/models/User');
const { sequelize } = require('../../../src/config/db');
const { Op } = require('sequelize');
const postController = require('../../../src/controllers/postController');

describe('Post Controller', () => {
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
    
    // Set up the transaction mock
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null),
    };
    sequelize.transaction.mockReturnValue(mockTransaction);
  });
  
  describe('createPost', () => {
    test('creates a post successfully with family associations', async () => {
      // Set up request
      const req = {
        body: {
          content: 'Test post content',
          mediaUrls: ['http://example.com/image.jpg'],
          type: 'regular',
          privacy: 'family',
          tags: ['family', 'fun'],
          familyIds: ['family-123'],
        },
        user: { id: 'user-123' },
      };
      
      // Mock family member check
      FamilyMember.findAll.mockResolvedValueOnce([{ familyId: 'family-123', userId: 'user-123' }]);
      
      // Mock post creation
      const mockCreatedPost = {
        id: 'post-123',
        content: 'Test post content',
        mediaUrls: ['http://example.com/image.jpg'],
        type: 'regular',
        privacy: 'family',
        tags: ['family', 'fun'],
        createdById: 'user-123',
      };
      
      Post.create.mockResolvedValueOnce(mockCreatedPost);
      
      // Mock post retrieval with associations
      Post.findByPk.mockResolvedValueOnce({
        ...mockCreatedPost,
        families: [{ id: 'family-123', name: 'Test Family' }],
        events: [],
      });
      
      // Call the controller
      await postController.createPost(req, res);
      
      // Assertions
      expect(FamilyMember.findAll).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          familyId: ['family-123'],
        },
        transaction: mockTransaction,
      });
      
      expect(Post.create).toHaveBeenCalledWith({
        content: 'Test post content',
        mediaUrls: ['http://example.com/image.jpg'],
        type: 'regular',
        privacy: 'family',
        tags: ['family', 'fun'],
        location: null,
        createdById: 'user-123',
      }, { transaction: mockTransaction });
      
      expect(PostFamily.bulkCreate).toHaveBeenCalledWith([
        { postId: 'post-123', familyId: 'family-123' },
      ], { transaction: mockTransaction });
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        post: expect.anything(),
      });
    });
    
    // Add more tests for the post controller...
  });
  
  // Add more test suites for other post controller functions...
});