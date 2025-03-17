// src/controllers/mediaController.js
const Media = require('../models/Media');
const FamilyMember = require('../models/FamilyMember');
const Family = require('../models/Family');
const Post = require('../models/Post');
const PostFamily = require('../models/PostFamily');
const { sequelize } = require('../config/db');
const { upload, uploadFile, deleteFile } = require('../services/fileUplad');

// @desc    Upload media file
// @route   POST /api/media/upload
// @access  Private
exports.uploadMedia = async (req, res) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const { familyId } = req.body;

      // Check if user has access to the family if familyId provided
      if (familyId) {
        const membership = await FamilyMember.findOne({
          where: {
            familyId,
            userId: req.user.id
          }
        });

        if (!membership) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to upload to this family'
          });
        }
      }

      // Process file upload
      const fileData = await uploadFile(req.file, req.user.id);

      // Create media record in database
      const media = await Media.create({
        url: fileData.url,
        thumbUrl: fileData.thumbUrl,
        type: fileData.type,
        name: fileData.name,
        size: fileData.size,
        mimeType: fileData.mimeType,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
        uploadedById: req.user.id
      });

      res.status(201).json({
        success: true,
        media
      });
    } catch (error) {
      console.error('Media upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  });
};

// @desc    Get family media
// @route   GET /api/families/:familyId/media
// @access  Private
exports.getFamilyMedia = async (req, res) => {
  try {
    const { familyId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;
    
    // Check if user is a member of this family
    const membership = await FamilyMember.findOne({
      where: {
        familyId,
        userId: req.user.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view media for this family'
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build query options
    const queryOptions = {
      where: {},
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Post,
          as: 'posts',
          required: true,
          include: [
            {
              model: Family,
              where: { id: familyId },
              through: { attributes: [] },
              as: 'families',
              required: true
            }
          ]
        }
      ]
    };
    
    // Add type filter if provided
    if (type) {
      queryOptions.where.type = type;
    }
    
    // Get media
    const { count, rows: media } = await Media.findAndCountAll(queryOptions);
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    res.json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page),
      media
    });
  } catch (error) {
    console.error('Get family media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's media uploads
// @route   GET /api/media
// @access  Private
exports.getUserMedia = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build query options
    const queryOptions = {
      where: {
        uploadedById: req.user.id
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    // Add type filter if provided
    if (type) {
      queryOptions.where.type = type;
    }
    
    // Get media
    const { count, rows: media } = await Media.findAndCountAll(queryOptions);
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    
    res.json({
      success: true,
      count,
      totalPages,
      currentPage: parseInt(page),
      media
    });
  } catch (error) {
    console.error('Get user media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete media
// @route   DELETE /api/media/:id
// @access  Private
exports.deleteMedia = async (req, res) => {
  try {
    const mediaId = req.params.id;
    
    // Get the media item
    const media = await Media.findByPk(mediaId);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }
    
    // Check if user is the uploader
    if (media.uploadedById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this media'
      });
    }
    
    // Delete physical files
    await deleteFile(media.url, media.thumbUrl);
    
    // Delete media record from database
    await media.destroy();
    
    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};