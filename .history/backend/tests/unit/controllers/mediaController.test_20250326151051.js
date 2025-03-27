// tests/unit/controllers/mediaController.test.js

// Mock dependencies first
jest.mock('../../../src/models/Media', () => ({
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    destroy: jest.fn(),
  }));
  
  jest.mock('../../../src/models/FamilyMember', () => ({
    findOne: jest.fn(),
  }));
  
  jest.mock('../../../src/models/Post', () => ({
    create: jest.fn(),
    findAll: jest.fn(),
  }));
  
  jest.mock('../../../src/models/PostFamily', () => ({
    create: jest.fn(),
  }));
  
  jest.mock('../../../src/services/fileUpload', () => ({
    upload: {
      single: jest.fn(() => (req, res, next) => next()),
    },
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  }));
  
  jest.mock('../../../src/config/db', () => ({
    sequelize: {
      transaction: jest.fn(() => ({
        commit: jest.fn().mockResolvedValue(null),
        rollback: jest.fn().mockResolvedValue(null),
      })),
    },
  }));
  
  // Import controller and dependencies
  const Media = require('../../../src/models/Media');
  const FamilyMember = require('../../../src/models/FamilyMember');
  const Post = require('../../../src/models/Post');
  const PostFamily = require('../../../src/models/PostFamily');
  const { upload, uploadFile, deleteFile } = require('../../../src/services/fileUpload');
  const { sequelize } = require('../../../src/config/db');
  const mediaController = require('../../../src/controllers/mediaController');
  const { Op } = require('sequelize');
  
  describe('Media Controller', () => {
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
      
      // Mock the upload.single middleware
      upload.single.mockImplementation(() => (req, res, next) => {
        next();
      });
    });
    
    describe('uploadMedia', () => {
      test('uploads media successfully', async () => {
        // Set up request with multer file
        const req = {
          file: {
            originalname: 'test-image.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            path: '/tmp/test-image.jpg',
          },
          body: {
            metadata: JSON.stringify({ description: 'Test image' }),
          },
          user: { id: 'user-123', firstName: 'Test' },
        };
        
        // Mock successful file upload to S3
        const fileData = {
          url: 'https://example.com/test-image.jpg',
          thumbUrl: 'https://example.com/test-image-thumb.jpg',
          type: 'image',
          name: 'test-image.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
        };
        
        uploadFile.mockResolvedValueOnce(fileData);
        
        // Mock successful media record creation
        const mediaRecord = {
          id: 'media-123',
          ...fileData,
          uploadedById: 'user-123',
          metadata: { description: 'Test image' },
          setDataValue: jest.fn(),
        };
        
        Media.create.mockResolvedValueOnce(mediaRecord);
        
        // Create a middleware wrapper for testing
        const middleware = upload.single('file');
        middleware(req, res, async () => {
          // After middleware runs, call the controller
          await mediaController.uploadMedia(req, res);
          
          // Assertions
          expect(uploadFile).toHaveBeenCalledWith(req.file, 'user-123');
          expect(Media.create).toHaveBeenCalledWith({
            url: 'https://example.com/test-image.jpg',
            thumbUrl: 'https://example.com/test-image-thumb.jpg',
            type: 'image',
            name: 'test-image.jpg',
            size: 1024,
            mimeType: 'image/jpeg',
            metadata: { description: 'Test image' },
            uploadedById: 'user-123',
          });
          
          expect(res.status).toHaveBeenCalledWith(201);
          expect(res.json).toHaveBeenCalledWith({
            success: true,
            media: mediaRecord,
          });
        });
      });
      
      test('uploads media and creates associated post when familyId is provided', async () => {
        // Set up request with multer file and familyId
        const req = {
          file: {
            originalname: 'family-image.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            path: '/tmp/family-image.jpg',
          },
          body: {
            familyId: 'family-123',
            metadata: JSON.stringify({ description: 'Family photo' }),
          },
          user: { id: 'user-123', firstName: 'Test' },
        };
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
          role: 'member',
        });
        
        // Mock successful file upload to S3
        const fileData = {
          url: 'https://example.com/family-image.jpg',
          thumbUrl: 'https://example.com/family-image-thumb.jpg',
          type: 'image',
          name: 'family-image.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
        };
        
        uploadFile.mockResolvedValueOnce(fileData);
        
        // Mock successful media record creation
        const mediaRecord = {
          id: 'media-123',
          ...fileData,
          uploadedById: 'user-123',
          metadata: { description: 'Family photo' },
          setDataValue: jest.fn(),
        };
        
        Media.create.mockResolvedValueOnce(mediaRecord);
        
        // Mock transaction
        const transaction = {
          commit: jest.fn().mockResolvedValue(null),
          rollback: jest.fn().mockResolvedValue(null),
        };
        
        sequelize.transaction.mockResolvedValueOnce(transaction);
        
        // Mock post creation
        const postRecord = {
          id: 'post-123',
          content: 'Test shared image',
          mediaUrls: ['https://example.com/family-image.jpg'],
          createdById: 'user-123',
        };
        
        Post.create.mockResolvedValueOnce(postRecord);
        
        // Create a middleware wrapper for testing
        const middleware = upload.single('file');
        middleware(req, res, async () => {
          // After middleware runs, call the controller
          await mediaController.uploadMedia(req, res);
          
          // Assertions
          expect(FamilyMember.findOne).toHaveBeenCalledWith({
            where: {
              familyId: 'family-123',
              userId: 'user-123',
            },
          });
          
          expect(uploadFile).toHaveBeenCalledWith(req.file, 'user-123');
          
          expect(Post.create).toHaveBeenCalledWith({
            content: 'Family photo',
            mediaUrls: ['https://example.com/family-image.jpg'],
            type: 'regular',
            privacy: 'family',
            tags: [],
            createdById: 'user-123',
          }, { transaction });
          
          expect(PostFamily.create).toHaveBeenCalledWith({
            postId: 'post-123',
            familyId: 'family-123',
          }, { transaction });
          
          expect(transaction.commit).toHaveBeenCalled();
          expect(mediaRecord.setDataValue).toHaveBeenCalledWith('post', postRecord);
          
          expect(res.status).toHaveBeenCalledWith(201);
          expect(res.json).toHaveBeenCalledWith({
            success: true,
            media: mediaRecord,
          });
        });
      });
      
      test('returns 400 if no file is uploaded', async () => {
        // Set up request without file
        const req = {
          file: undefined, // No file uploaded
          body: {},
          user: { id: 'user-123' },
        };
        
        // Create a middleware wrapper for testing
        const middleware = upload.single('file');
        middleware(req, res, async () => {
          // After middleware runs, call the controller
          await mediaController.uploadMedia(req, res);
          
          // Assertions
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'No file uploaded',
          });
          
          expect(uploadFile).not.toHaveBeenCalled();
          expect(Media.create).not.toHaveBeenCalled();
        });
      });
      
      test('returns 403 if user does not have access to specified family', async () => {
        // Set up request with familyId but no membership
        const req = {
          file: {
            originalname: 'test-image.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
          },
          body: {
            familyId: 'family-123',
          },
          user: { id: 'user-123' },
        };
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Create a middleware wrapper for testing
        const middleware = upload.single('file');
        middleware(req, res, async () => {
          // After middleware runs, call the controller
          await mediaController.uploadMedia(req, res);
          
          // Assertions
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Not authorized to upload to this family',
          });
          
          expect(uploadFile).not.toHaveBeenCalled();
          expect(Media.create).not.toHaveBeenCalled();
        });
      });
      
      test('handles upload errors gracefully', async () => {
        // Set up request with multer file
        const req = {
          file: {
            originalname: 'test-image.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
          },
          body: {},
          user: { id: 'user-123' },
        };
        
        // Mock file upload error
        uploadFile.mockRejectedValueOnce(new Error('Upload failed'));
        
        // Create a middleware wrapper for testing
        const middleware = upload.single('file');
        middleware(req, res, async () => {
          // After middleware runs, call the controller
          await mediaController.uploadMedia(req, res);
          
          // Assertions
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: 'Server error',
            error: 'Upload failed',
          });
          
          expect(Media.create).not.toHaveBeenCalled();
        });
      });
    });
    
    describe('getFamilyMedia', () => {
      test('gets media for a family successfully', async () => {
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
        });
        
        // Mock posts with media URLs
        const posts = [
          { 
            id: 'post-1', 
            mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'] 
          },
          { 
            id: 'post-2', 
            mediaUrls: ['https://example.com/image3.jpg'] 
          },
        ];
        
        Post.findAll.mockResolvedValueOnce(posts);
        
        // Mock media retrieval
        const mediaRecords = {
          count: 3,
          rows: [
            { id: 'media-1', url: 'https://example.com/image1.jpg', type: 'image' },
            { id: 'media-2', url: 'https://example.com/image2.jpg', type: 'image' },
            { id: 'media-3', url: 'https://example.com/image3.jpg', type: 'image' },
          ],
        };
        
        Media.findAndCountAll.mockResolvedValueOnce(mediaRecords);
        
        // Call the controller
        await mediaController.getFamilyMedia(req, res);
        
        // Assertions
        expect(FamilyMember.findOne).toHaveBeenCalledWith({
          where: {
            familyId: 'family-123',
            userId: 'user-123',
          },
        });
        
        expect(Post.findAll).toHaveBeenCalledWith({
          include: [
            {
              model: expect.anything(),
              through: { attributes: [] },
              as: 'families',
              where: { id: 'family-123' },
              required: true,
            },
          ],
          where: {
            mediaUrls: { [Op.ne]: [] }, // Only posts with media
          },
        });
        
        expect(Media.findAndCountAll).toHaveBeenCalledWith({
          where: {
            url: { [Op.in]: [
              'https://example.com/image1.jpg',
              'https://example.com/image2.jpg',
              'https://example.com/image3.jpg'
            ] }
          },
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 3,
          totalPages: 1,
          currentPage: 1,
          media: mediaRecords.rows,
        });
      });
      
      test('returns 403 if user is not a member of the family', async () => {
        // Set up request
        const req = {
          params: { familyId: 'family-123' },
          query: {},
          user: { id: 'user-456' }, // Non-member
        };
        
        // Mock family member check - not a member
        FamilyMember.findOne.mockResolvedValueOnce(null);
        
        // Call the controller
        await mediaController.getFamilyMedia(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to view media for this family',
        });
        
        expect(Post.findAll).not.toHaveBeenCalled();
        expect(Media.findAndCountAll).not.toHaveBeenCalled();
      });
      
      test('filters media by type when provided', async () => {
        // Set up request with type filter
        const req = {
          params: { familyId: 'family-123' },
          query: { page: 1, limit: 10, type: 'image' },
          user: { id: 'user-123' },
        };
        
        // Mock family member check
        FamilyMember.findOne.mockResolvedValueOnce({
          familyId: 'family-123',
          userId: 'user-123',
        });
        
        // Mock posts with media URLs
        const posts = [
          { id: 'post-1', mediaUrls: ['https://example.com/image1.jpg'] },
          { id: 'post-2', mediaUrls: ['https://example.com/document.pdf'] },
        ];
        
        Post.findAll.mockResolvedValueOnce(posts);
        
        // Mock media retrieval with type filter
        const mediaRecords = {
          count: 1,
          rows: [
            { id: 'media-1', url: 'https://example.com/image1.jpg', type: 'image' },
          ],
        };
        
        Media.findAndCountAll.mockResolvedValueOnce(mediaRecords);
        
        // Call the controller
        await mediaController.getFamilyMedia(req, res);
        
        // Assertions
        expect(Media.findAndCountAll).toHaveBeenCalledWith({
          where: {
            url: { [Op.in]: [
              'https://example.com/image1.jpg',
              'https://example.com/document.pdf'
            ] },
            type: 'image', // Should include type filter
          },
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 1,
          totalPages: 1,
          currentPage: 1,
          media: mediaRecords.rows,
        });
      });
    });
    
    describe('getUserMedia', () => {
      test('gets user\'s media uploads successfully', async () => {
        // Set up request
        const req = {
          query: { page: 1, limit: 10 },
          user: { id: 'user-123' },
        };
        
        // Mock media retrieval
        const mediaRecords = {
          count: 2,
          rows: [
            { id: 'media-1', url: 'https://example.com/image1.jpg', type: 'image' },
            { id: 'media-2', url: 'https://example.com/document.pdf', type: 'document' },
          ],
        };
        
        Media.findAndCountAll.mockResolvedValueOnce(mediaRecords);
        
        // Call the controller
        await mediaController.getUserMedia(req, res);
        
        // Assertions
        expect(Media.findAndCountAll).toHaveBeenCalledWith({
          where: {
            uploadedById: 'user-123',
          },
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 2,
          totalPages: 1,
          currentPage: 1,
          media: mediaRecords.rows,
        });
      });
      
      test('filters media by type when provided', async () => {
        // Set up request with type filter
        const req = {
          query: { page: 1, limit: 10, type: 'document' },
          user: { id: 'user-123' },
        };
        
        // Mock media retrieval with type filter
        const mediaRecords = {
          count: 1,
          rows: [
            { id: 'media-2', url: 'https://example.com/document.pdf', type: 'document' },
          ],
        };
        
        Media.findAndCountAll.mockResolvedValueOnce(mediaRecords);
        
        // Call the controller
        await mediaController.getUserMedia(req, res);
        
        // Assertions
        expect(Media.findAndCountAll).toHaveBeenCalledWith({
          where: {
            uploadedById: 'user-123',
            type: 'document', // Should include type filter
          },
          order: [['createdAt', 'DESC']],
          limit: 10,
          offset: 0,
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 1,
          totalPages: 1,
          currentPage: 1,
          media: mediaRecords.rows,
        });
      });
      
      test('handles pagination correctly', async () => {
        // Set up request with custom pagination
        const req = {
          query: { page: 2, limit: 5 },
          user: { id: 'user-123' },
        };
        
        // Mock media retrieval with pagination
        const mediaRecords = {
          count: 12, // Total 12 items, showing page 2 with 5 per page
          rows: [
            // Items 6-10
            { id: 'media-6', url: 'https://example.com/image6.jpg' },
            { id: 'media-7', url: 'https://example.com/image7.jpg' },
            { id: 'media-8', url: 'https://example.com/image8.jpg' },
            { id: 'media-9', url: 'https://example.com/image9.jpg' },
            { id: 'media-10', url: 'https://example.com/image10.jpg' },
          ],
        };
        
        Media.findAndCountAll.mockResolvedValueOnce(mediaRecords);
        
        // Call the controller
        await mediaController.getUserMedia(req, res);
        
        // Assertions
        expect(Media.findAndCountAll).toHaveBeenCalledWith({
          where: {
            uploadedById: 'user-123',
          },
          order: [['createdAt', 'DESC']],
          limit: 5,
          offset: 5, // Page 2 with 5 items per page
        });
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          count: 12,
          totalPages: 3, // Total pages = ceil(12/5) = 3
          currentPage: 2,
          media: mediaRecords.rows,
        });
      });
    });
    
    describe('deleteMedia', () => {
      test('deletes media successfully when user is the uploader', async () => {
        // Set up request
        const req = {
          params: { id: 'media-123' },
          user: { id: 'user-123' },
        };
        
        // Mock transaction
        const transaction = {
          commit: jest.fn().mockResolvedValue(null),
          rollback: jest.fn().mockResolvedValue(null),
        };
        
        sequelize.transaction.mockResolvedValueOnce(transaction);
        
        // Mock media retrieval
        const mediaRecord = {
          id: 'media-123',
          url: 'https://example.com/image.jpg',
          thumbUrl: 'https://example.com/image-thumb.jpg',
          uploadedById: 'user-123', // User is uploader
          destroy: jest.fn().mockResolvedValue(true),
        };
        
        Media.findByPk.mockResolvedValueOnce(mediaRecord);
        
        // Mock posts referencing this media
        const posts = [
          {
            id: 'post-1',
            mediaUrls: [
              'https://example.com/image.jpg',
              'https://example.com/other-image.jpg',
            ],
            save: jest.fn().mockResolvedValue(true),
          },
        ];
        
        Post.findAll.mockResolvedValueOnce(posts);
        
        // Mock successful file deletion
        deleteFile.mockResolvedValueOnce(true);
        
        // Call the controller
        await mediaController.deleteMedia(req, res);
        
        // Assertions
        expect(Media.findByPk).toHaveBeenCalledWith('media-123', { transaction });
        
        expect(Post.findAll).toHaveBeenCalledWith({
          where: {
            mediaUrls: { [Op.contains]: ['https://example.com/image.jpg'] },
          },
          transaction,
        });
        
        // Should update the post's mediaUrls array
        expect(posts[0].mediaUrls).toEqual(['https://example.com/other-image.jpg']);
        expect(posts[0].save).toHaveBeenCalledWith({ transaction });
        
        expect(deleteFile).toHaveBeenCalledWith(
          'https://example.com/image.jpg',
          'https://example.com/image-thumb.jpg'
        );
        
        expect(mediaRecord.destroy).toHaveBeenCalledWith({ transaction });
        expect(transaction.commit).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Media deleted successfully',
        });
      });
      
      test('returns 404 if media does not exist', async () => {
        // Set up request
        const req = {
          params: { id: 'nonexistent-media' },
          user: { id: 'user-123' },
        };
        
        // Mock transaction
        const transaction = {
          commit: jest.fn().mockResolvedValue(null),
          rollback: jest.fn().mockResolvedValue(null),
        };
        
        sequelize.transaction.mockResolvedValueOnce(transaction);
        
        // Mock media not found
        Media.findByPk.mockResolvedValueOnce(null);
        
        // Call the controller
        await mediaController.deleteMedia(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Media not found',
        });
        
        expect(transaction.rollback).toHaveBeenCalled();
        expect(deleteFile).not.toHaveBeenCalled();
      });
      
      test('returns 403 if user is not the uploader', async () => {
        // Set up request
        const req = {
          params: { id: 'media-123' },
          user: { id: 'user-456' }, // Different user
        };
        
        // Mock transaction
        const transaction = {
          commit: jest.fn().mockResolvedValue(null),
          rollback: jest.fn().mockResolvedValue(null),
        };
        
        sequelize.transaction.mockResolvedValueOnce(transaction);
        
        // Mock media retrieval with different uploader
        const mediaRecord = {
          id: 'media-123',
          url: 'https://example.com/image.jpg',
          uploadedById: 'user-123', // Different from req.user.id
        };
        
        Media.findByPk.mockResolvedValueOnce(mediaRecord);
        
        // Call the controller
        await mediaController.deleteMedia(req, res);
        
        // Assertions
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Not authorized to delete this media',
        });
        
        expect(transaction.rollback).toHaveBeenCalled();
        expect(deleteFile).not.toHaveBeenCalled();
      });
      
      test('handles S3 deletion failure gracefully', async () => {
        // Set up request
        const req = {
          params: { id: 'media-123' },
          user: { id: 'user-123' },
        };
        
        // Mock transaction
        const transaction = {
          commit: jest.fn().mockResolvedValue(null),
          rollback: jest.fn().mockResolvedValue(null),
        };
        
        sequelize.transaction.mockResolvedValueOnce(transaction);
        
        // Mock media retrieval
        const mediaRecord = {
          id: 'media-123',
          url: 'https://example.com/image.jpg',
          thumbUrl: 'https://example.com/image-thumb.jpg',
          uploadedById: 'user-123',
          destroy: jest.fn().mockResolvedValue(true),
        };
        
        Media.findByPk.mockResolvedValueOnce(mediaRecord);
        
        // Mock no posts reference this media
        Post.findAll.mockResolvedValueOnce([]);
        
        // Mock file deletion failure
        deleteFile.mockResolvedValueOnce(false);
        
        // Mock console.warn for testing
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Call the controller
        await mediaController.deleteMedia(req, res);
        
        // Assertions
        expect(deleteFile).toHaveBeenCalledWith(
          'https://example.com/image.jpg',
          'https://example.com/image-thumb.jpg'
        );
        
        // Should warn about S3 deletion failure but continue
        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(mediaRecord.destroy).toHaveBeenCalledWith({ transaction });
        expect(transaction.commit).toHaveBeenCalled();
        
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Media deleted successfully',
        });
        
        // Restore console.warn
        consoleWarnSpy.mockRestore();
      });
    });
  });