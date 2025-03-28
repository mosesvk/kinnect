// tests/unit/controllers/mediaController.test.js - Fixed version

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

// Import controller and dependencies directly, without sequelize.define
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
  let mockTransaction;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh response mock
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    
    // Mock the transaction
    mockTransaction = {
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null),
    };
    sequelize.transaction.mockReturnValue(mockTransaction);
    
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
      const middleware = (req, res, next) => next();
      
      // Call the controller after middleware runs
      await middleware(req, res, async () => {
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
    
    // Add more tests for uploadMedia...
  });
  
  // Add more test suites for other media controller functions...
});