// tests/unit/controllers/postController.test.js

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
    
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      
      // Create a fresh response mock
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      
      // Set up the transaction mock
      sequelize.transaction.mockImplementation(() => ({
        commit: jest.fn().mockResolvedValue(null),
        rollback: jest.fn().mockResolvedValue(null),
      }));
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
          transaction: expect.anything(),
        });
        
        expect(Post.create).toHaveBeenCalledWith({
          content: 'Test post content',
          mediaUrls: ['http://example.com/image.jpg'],
          type: 'regular',
          privacy: 'family',
          tags: ['family', 'fun'],
          location: null,
          createdById: 'user-123',
        }, { transaction: expect.anything() });
        
        expect(PostFamily.bulkCreate).toHaveBeenCalledWith([
          { postId: 'post-123', familyId: 'family-123' },
        ], { transaction: expect.anything() });
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          post: expect.anything(),
        });
      });
      
      test('returns 403 if user does not have access to specified families', async () => {
        // Set up request
        const req = {
          body: {
            content: 'Test post content',
            familyIds: ['family-123', 'family-456'], // User only has access to one family
          },
          user: { id: 'user-123' },
        };
        
        // Mock family member check to return less memberships than requested
        FamilyMember.findAll.mockResolvedValueOnce([{ familyId: 'family-123', userId: 'user-123' }]);
        
        // Call the controller
        await postController.createPost(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: expect.stringContaining('do not have access'),
        });
        expect(sequelize.transaction().rollback).toHaveBeenCalled();
      });
      
      test('creates a post with both family and event associations', async () => {
        // Set up request
        const req = {
          body: {
            content: 'Test post content',
            familyIds: ['family-123'],
            eventIds: ['event-123'],
          },
          user: { id: 'user-123' },
        };
        
        // Mock family member check
        FamilyMember.findAll.mockResolvedValueOnce([{ familyId: 'family-123', userId: 'user-123' }]);
        
        // Mock event access check
        Event.findAll.mockResolvedValueOnce([{ id: 'event-123', familyId: 'family-123' }]);
        FamilyMember.findOne.mockResolvedValueOnce({ familyId: 'family-123', userId: 'user-123' });
        
        // Mock post creation
        const mockCreatedPost = {
          id: 'post-123',
          content: 'Test post content',
          createdById: 'user-123',
        };
        
        Post.create.mockResolvedValueOnce(mockCreatedPost);
        
        // Mock post retrieval with associations
        Post.findByPk.mockResolvedValueOnce({
          ...mockCreatedPost,
          families: [{ id: 'family-123', name: 'Test Family' }],
          events: [{ id: 'event-123', title: 'Test Event' }],
        });
        
        // Call the controller
        await postController.createPost(req, res);
        
        // Assertions
        expect(PostFamily.bulkCreate).toHaveBeenCalledWith([
          { postId: 'post-123', familyId: 'family-123' },
        ], { transaction: expect.anything() });
        
        expect(PostEvent.bulkCreate).toHaveBeenCalledWith([
          { postId: 'post-123', eventId: 'event-123' },
        ], { transaction: expect.anything() });
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          post: expect.anything(),
        });
      });
    });
    
    describe('getPostById', () => {
      test('gets a post by ID successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          content: 'Test post content',
          privacy: 'family',
          createdById: 'user-123',
          toJSON: jest.fn().mockReturnValue({
            id: 'post-123',
            content: 'Test post content',
            privacy: 'family',
            createdById: 'user-123',
            families: [{ id: 'family-123' }],
          }),
          families: [{ id: 'family-123' }],
          author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
          comments: [],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock access check
        FamilyMember.findOne.mockResolvedValueOnce({ familyId: 'family-123', userId: 'user-123' });
        
        // Mock likes count
        Like.count.mockResolvedValueOnce(5);
        
        // Mock user like check
        Like.findOne.mockResolvedValueOnce({ reaction: 'like' });
        
        // Call the controller
        await postController.getPostById(req, res);
        
        // Assertions
        expect(Post.findByPk).toHaveBeenCalledWith('post-123', expect.anything());
        expect(FamilyMember.findOne).toHaveBeenCalled();
        expect(Like.count).toHaveBeenCalled();
        expect(Like.findOne).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          post: expect.objectContaining({
            id: 'post-123',
            likesCount: 5,
            userLiked: true,
            userReaction: 'like',
          }),
        });
      });
      
      test('returns 404 if post is not found', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-post' },
          user: { id: 'user-123' },
        };
        
        // Mock post not found
        Post.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.getPostById(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Post not found',
        });
      });
      
      test('returns 403 if user does not have access to the post', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          content: 'Test post content',
          privacy: 'family', // Not public
          createdById: 'user-123',
          toJSON: jest.fn().mockReturnValue({
            id: 'post-123',
            content: 'Test post content',
            privacy: 'family',
            createdById: 'user-123',
            families: [{ id: 'family-123' }],
          }),
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock access check - user not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.getPostById(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view this post',
        });
      });
      
      test('allows access to public posts even if user is not a family member', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval with public privacy
        const mockPost = {
          id: 'post-123',
          content: 'Test post content',
          privacy: 'public', // Public post
          createdById: 'user-123',
          toJSON: jest.fn().mockReturnValue({
            id: 'post-123',
            content: 'Test post content',
            privacy: 'public',
            createdById: 'user-123',
            families: [{ id: 'family-123' }],
          }),
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // No need to check family membership for public posts
        // The controller should skip this check
        
        // Mock likes count
        Like.count.mockResolvedValueOnce(5);
        
        // Mock user like check
        Like.findOne.mockResolvedValueOnce(null); // User hasn't liked it
        
        // Call the controller
        await postController.getPostById(req, res);
        
        // Assertions
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          post: expect.objectContaining({
            id: 'post-123',
            privacy: 'public',
            likesCount: 5,
            userLiked: false,
            userReaction: null,
          }),
        });
      });
    });
    
    describe('updatePost', () => {
      test('updates a post successfully when user is the creator', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: {
            content: 'Updated content',
            tags: ['updated', 'tags'],
          },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          content: 'Original content',
          tags: ['original', 'tags'],
          createdById: 'user-123', // Same as req.user.id
          save: jest.fn().mockResolvedValue(true),
          families: [],
          events: [],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock post retrieval after update
        const updatedPost = {
          ...mockPost,
          content: 'Updated content',
          tags: ['updated', 'tags'],
        };
        
        Post.findByPk.mockResolvedValueOnce(updatedPost);
        
        // Call the controller
        await postController.updatePost(req, res);
        
        // Assertions
        expect(mockPost.content).toBe('Updated content');
        expect(mockPost.tags).toEqual(['updated', 'tags']);
        expect(mockPost.save).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          post: updatedPost,
        });
      });
      
      test('returns 404 if post is not found', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-post' },
          body: { content: 'Updated content' },
          user: { id: 'user-123' },
        };
        
        // Mock post not found
        Post.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.updatePost(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Post not found',
        });
        expect(sequelize.transaction().rollback).toHaveBeenCalled();
      });
      
      test('returns 403 if user is not the creator of the post', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { content: 'Updated content' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          content: 'Original content',
          createdById: 'user-123', // Different from req.user.id
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Call the controller
        await postController.updatePost(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to update this post',
        });
        expect(sequelize.transaction().rollback).toHaveBeenCalled();
      });
      
      test('updates family associations if familyIds are provided', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: {
            content: 'Updated content',
            familyIds: ['family-456'], // New family association
          },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          content: 'Original content',
          createdById: 'user-123',
          save: jest.fn().mockResolvedValue(true),
          families: [{ id: 'family-123' }], // Original family association
          events: [],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock family member check
        FamilyMember.findAll.mockResolvedValueOnce([{ familyId: 'family-456', userId: 'user-123' }]);
        
        // Mock post retrieval after update
        const updatedPost = {
          ...mockPost,
          content: 'Updated content',
          families: [{ id: 'family-456' }], // Updated family association
        };
        
        Post.findByPk.mockResolvedValueOnce(updatedPost);
        
        // Call the controller
        await postController.updatePost(req, res);
        
        // Assertions
        expect(PostFamily.destroy).toHaveBeenCalledWith({
          where: { postId: 'post-123' },
          transaction: expect.anything(),
        });
        
        expect(PostFamily.bulkCreate).toHaveBeenCalledWith([
          { postId: 'post-123', familyId: 'family-456' },
        ], { transaction: expect.anything() });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          post: updatedPost,
        });
      });
    });
    
    describe('deletePost', () => {
      test('deletes a post successfully when user is the creator', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          createdById: 'user-123', // Same as req.user.id
          destroy: jest.fn().mockResolvedValue(true),
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Call the controller
        await postController.deletePost(req, res);
        
        // Assertions
        expect(Comment.destroy).toHaveBeenCalled(); // Should delete associated comments
        expect(Like.destroy).toHaveBeenCalled(); // Should delete associated likes
        expect(PostFamily.destroy).toHaveBeenCalled(); // Should delete family associations
        expect(PostEvent.destroy).toHaveBeenCalled(); // Should delete event associations
        expect(mockPost.destroy).toHaveBeenCalled(); // Should delete the post
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Post deleted successfully',
        });
      });
      
      test('returns 404 if post is not found', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-post' },
          user: { id: 'user-123' },
        };
        
        // Mock post not found
        Post.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.deletePost(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Post not found',
        });
        expect(sequelize.transaction().rollback).toHaveBeenCalled();
      });
      
      test('returns 403 if user is not the creator or family admin', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          createdById: 'user-123', // Different from req.user.id
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock family admin check - not an admin
        sequelize.query.mockResolvedValueOnce([]);
        
        // Call the controller
        await postController.deletePost(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to delete this post',
        });
        expect(sequelize.transaction().rollback).toHaveBeenCalled();
      });
      
      test('allows deletion if user is a family admin even if not the creator', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          createdById: 'user-123', // Different from req.user.id
          destroy: jest.fn().mockResolvedValue(true),
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock family admin check - is an admin
        sequelize.query.mockResolvedValueOnce([{ userId: 'user-456' }]);
        
        // Call the controller
        await postController.deletePost(req, res);
        
        // Assertions
        expect(mockPost.destroy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Post deleted successfully',
        });
      });
    });
    
    describe('likePost', () => {
      test('likes a post successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { reaction: 'like' },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public', // Public post for simplicity
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock existing like check - no previous like
        Like.findOne.mockResolvedValueOnce(null);
        
        // Mock likes count after adding
        Like.count.mockResolvedValueOnce(5);
        
        // Call the controller
        await postController.likePost(req, res);
        
        // Assertions
        expect(Like.create).toHaveBeenCalledWith({
          userId: 'user-123',
          targetType: 'post',
          targetId: 'post-123',
          reaction: 'like',
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Post liked',
          isLiked: true,
          reaction: 'like',
          likesCount: 5,
        });
      });
      
      test('updates an existing like with a different reaction', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { reaction: 'love' }, // New reaction
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public',
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock existing like check - has previous like with different reaction
        const existingLike = {
          userId: 'user-123',
          targetType: 'post',
          targetId: 'post-123',
          reaction: 'like', // Previous reaction
          save: jest.fn().mockResolvedValue(true),
        };
        
        Like.findOne.mockResolvedValueOnce(existingLike);
        
        // Mock likes count after update
        Like.count.mockResolvedValueOnce(5);
        
        // Call the controller
        await postController.likePost(req, res);
        
        // Assertions
        expect(existingLike.reaction).toBe('love'); // Should update reaction
        expect(existingLike.save).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Reaction updated',
          isLiked: true,
          reaction: 'love',
          likesCount: 5,
        });
      });
      
      test('removes a like when the same reaction is sent again (toggle)', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { reaction: 'like' }, // Same reaction as existing
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public',
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock existing like check - has same reaction already
        const existingLike = {
          userId: 'user-123',
          targetType: 'post',
          targetId: 'post-123',
          reaction: 'like', // Same as requested
          destroy: jest.fn().mockResolvedValue(true),
        };
        
        Like.findOne.mockResolvedValueOnce(existingLike);
        
        // Call the controller
        await postController.likePost(req, res);
        
        // Assertions
        expect(existingLike.destroy).toHaveBeenCalled(); // Should remove the like
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Reaction removed',
          isLiked: false,
        });
      });
      
      test('returns 404 if post is not found', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-post' },
          body: { reaction: 'like' },
          user: { id: 'user-123' },
        };
        
        // Mock post not found
        Post.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.likePost(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Post not found',
        });
      });
      
      test('returns 403 if user does not have access to the post', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { reaction: 'like' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'family', // Not public
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock access check - user not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.likePost(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to interact with this post',
        });
      });
    });
    
    describe('addComment', () => {
      test('adds a comment to a post successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { content: 'Test comment' },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public', // Public post for simplicity
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock comment creation
        const mockComment = {
          id: 'comment-123',
          postId: 'post-123',
          userId: 'user-123',
          content: 'Test comment',
        };
        
        Comment.create.mockResolvedValueOnce(mockComment);
        
        // Mock comment retrieval with author info
        const commentWithUser = {
          ...mockComment,
          author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
        };
        
        Comment.findByPk.mockResolvedValueOnce(commentWithUser);
        
        // Call the controller
        await postController.addComment(req, res);
        
        // Assertions
        expect(Comment.create).toHaveBeenCalledWith({
          postId: 'post-123',
          userId: 'user-123',
          content: 'Test comment',
          mediaUrl: undefined,
          parentId: undefined,
        });
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          comment: commentWithUser,
        });
      });
      
      test('adds a reply to another comment', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { 
            content: 'Test reply',
            parentId: 'comment-456' // Parent comment ID
          },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public',
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock parent comment check
        Comment.findOne.mockResolvedValueOnce({
          id: 'comment-456',
          postId: 'post-123',
        });
        
        // Mock comment creation
        const mockComment = {
          id: 'comment-789',
          postId: 'post-123',
          userId: 'user-123',
          content: 'Test reply',
          parentId: 'comment-456',
        };
        
        Comment.create.mockResolvedValueOnce(mockComment);
        
        // Mock comment retrieval with author info
        const commentWithUser = {
          ...mockComment,
          author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
        };
        
        Comment.findByPk.mockResolvedValueOnce(commentWithUser);
        
        // Call the controller
        await postController.addComment(req, res);
        
        // Assertions
        expect(Comment.create).toHaveBeenCalledWith({
          postId: 'post-123',
          userId: 'user-123',
          content: 'Test reply',
          mediaUrl: undefined,
          parentId: 'comment-456',
        });
        
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          comment: commentWithUser,
        });
      });
      
      test('returns 404 if post is not found', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-post' },
          body: { content: 'Test comment' },
          user: { id: 'user-123' },
        };
        
        // Mock post not found
        Post.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.addComment(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Post not found',
        });
      });
      
      test('returns 403 if user does not have access to the post', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          body: { content: 'Test comment' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'family', // Not public
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock access check - user not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.addComment(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to comment on this post',
        });
      });
      
      test('returns 400 if parentId is invalid', async () => {
        // Set up request with invalid parent comment ID
        const req = {
          params: { id: 'post-123' },
          body: { 
            content: 'Test reply',
            parentId: 'comment-invalid'
          },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public',
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock parent comment check - not found
        Comment.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.addComment(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid parent comment ID',
        });
      });
    });
    
    describe('getComments', () => {
      test('gets comments for a post successfully', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          query: { page: 1, limit: 10 },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public', // Public post for simplicity
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock comments retrieval
        const mockComments = {
          count: 2,
          rows: [
            {
              id: 'comment-1',
              content: 'Test comment 1',
              author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
              replies: [],
            },
            {
              id: 'comment-2',
              content: 'Test comment 2',
              author: { id: 'user-456', firstName: 'Another', lastName: 'User' },
              replies: [
                {
                  id: 'comment-3',
                  content: 'Test reply',
                  author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
                }
              ],
            }
          ],
        };
        
        Comment.findAndCountAll.mockResolvedValueOnce(mockComments);
        
        // Call the controller
        await postController.getComments(req, res);
        
        // Assertions
        expect(Comment.findAndCountAll).toHaveBeenCalledWith({
          where: {
            postId: 'post-123',
            parentId: null,
          },
          include: expect.anything(),
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          totalPages: 1,
          currentPage: 1,
          comments: mockComments.rows,
        });
      });
      
      test('returns 404 if post is not found', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-post' },
          query: {},
          user: { id: 'user-123' },
        };
        
        // Mock post not found
        Post.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.getComments(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Post not found',
        });
      });
      
      test('returns 403 if user does not have access to the post', async () => {
        // Set up request
        const req = {
          params: { id: 'post-123' },
          query: {},
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'family', // Not public
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock access check - user not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.getComments(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view comments on this post',
        });
      });
      
      test('handles pagination correctly', async () => {
        // Set up request with custom pagination
        const req = {
          params: { id: 'post-123' },
          query: { page: 2, limit: 5 },
          user: { id: 'user-123' },
        };
        
        // Mock post retrieval
        const mockPost = {
          id: 'post-123',
          privacy: 'public',
          families: [{ id: 'family-123' }],
        };
        
        Post.findByPk.mockResolvedValueOnce(mockPost);
        
        // Mock comments retrieval
        const mockComments = {
          count: 12, // Total 12 comments, showing page 2 with 5 per page
          rows: [
            // Page 2 results (comments 6-10)
            { id: 'comment-6', content: 'Comment 6' },
            { id: 'comment-7', content: 'Comment 7' },
            { id: 'comment-8', content: 'Comment 8' },
            { id: 'comment-9', content: 'Comment 9' },
            { id: 'comment-10', content: 'Comment 10' },
          ],
        };
        
        Comment.findAndCountAll.mockResolvedValueOnce(mockComments);
        
        // Call the controller
        await postController.getComments(req, res);
        
        // Assertions
        expect(Comment.findAndCountAll).toHaveBeenCalledWith({
          where: {
            postId: 'post-123',
            parentId: null,
          },
          include: expect.anything(),
          order: [['createdAt', 'DESC']],
          limit: 5,
          offset: 5, // Page 2 with 5 items per page
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 12,
          totalPages: 3, // Total pages = ceil(12/5) = 3
          currentPage: 2,
          comments: mockComments.rows,
        });
      });
    });
    
    describe('getFamilyPosts', () => {
      test('gets posts for a family successfully', async () => {
        // Set up request
        const req = {
          params: { familyId: 'family-123' },
          query: { page: 1, limit: 10 },
          user: { id: 'user-123' },
        };
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'member',
        });
        
        // Mock posts retrieval
        const mockPosts = {
          count: 2,
          rows: [
            {
              id: 'post-1',
              content: 'Family post 1',
              author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
              families: [{ id: 'family-123', name: 'Test Family' }],
            },
            {
              id: 'post-2',
              content: 'Family post 2',
              author: { id: 'user-456', firstName: 'Another', lastName: 'User' },
              families: [{ id: 'family-123', name: 'Test Family' }],
            }
          ],
        };
        
        Post.findAndCountAll.mockResolvedValueOnce(mockPosts);
        
        // Call the controller
        await postController.getFamilyPosts(req, res);
        
        // Assertions
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123',
          },
        });
        
        expect(Post.findAndCountAll).toHaveBeenCalledWith({
          include: expect.anything(),
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          totalPages: 1,
          currentPage: 1,
          posts: mockPosts.rows,
        });
      });
      
      test('returns 403 if user is not a member of the family', async () => {
        // Set up request
        const req = {
          params: { familyId: 'family-123' },
          query: {},
          user: { id: 'user-456' }, // User not in the family
        };
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.getFamilyPosts(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view posts for this family',
        });
      });
      
      test('filters posts by type when provided', async () => {
        // Set up request with type filter
        const req = {
          params: { familyId: 'family-123' },
          query: { page: 1, limit: 10, type: 'memory' },
          user: { id: 'user-123' },
        };
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'member',
        });
        
        // Mock posts retrieval with type filter
        const mockPosts = {
          count: 1,
          rows: [
            {
              id: 'post-1',
              content: 'Memory post',
              type: 'memory',
              author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
              families: [{ id: 'family-123', name: 'Test Family' }],
            }
          ],
        };
        
        Post.findAndCountAll.mockResolvedValueOnce(mockPosts);
        
        // Call the controller
        await postController.getFamilyPosts(req, res);
        
        // Assertions
        expect(Post.findAndCountAll).toHaveBeenCalledWith({
          include: expect.anything(),
          where: { type: 'memory' }, // Should include type filter
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 1,
          totalPages: 1,
          currentPage: 1,
          posts: mockPosts.rows,
        });
      });
    });
    
    describe('getEventPosts', () => {
      test('gets posts for an event successfully', async () => {
        // Set up request
        const req = {
          params: { eventId: 'event-123' },
          query: { page: 1, limit: 10 },
          user: { id: 'user-123' },
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'member',
        });
        
        // Mock posts retrieval
        const mockPosts = {
          count: 2,
          rows: [
            {
              id: 'post-1',
              content: 'Event post 1',
              author: { id: 'user-123', firstName: 'Test', lastName: 'User' },
              events: [{ id: 'event-123', title: 'Test Event' }],
            },
            {
              id: 'post-2',
              content: 'Event post 2',
              author: { id: 'user-456', firstName: 'Another', lastName: 'User' },
              events: [{ id: 'event-123', title: 'Test Event' }],
            }
          ],
        };
        
        Post.findAndCountAll.mockResolvedValueOnce(mockPosts);
        
        // Call the controller
        await postController.getEventPosts(req, res);
        
        // Assertions
        expect(Event.findByPk).toHaveBeenCalledWith('event-123');
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123',
          },
        });
        
        expect(Post.findAndCountAll).toHaveBeenCalledWith({
          include: expect.anything(),
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          totalPages: 1,
          currentPage: 1,
          posts: mockPosts.rows,
        });
      });
      
      test('returns 404 if event does not exist', async () => {
        // Set up request
        const req = {
          params: { eventId: 'nonexistent-event' },
          query: {},
          user: { id: 'user-123' },
        };
        
        // Mock event not found
        Event.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.getEventPosts(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Event not found',
        });
      });
      
      test('returns 403 if user is not a member of the event\'s family', async () => {
        // Set up request
        const req = {
          params: { eventId: 'event-123' },
          query: {},
          user: { id: 'user-456' }, // User not in the family
        };
        
        // Mock event retrieval
        const mockEvent = {
          id: 'event-123',
          familyId: 'family-123',
        };
        
        Event.findByPk.mockResolvedValueOnce(mockEvent);
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await postController.getEventPosts(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view posts for this event',
        });
      });
    });
  });