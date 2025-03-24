// src/controllers/mediaController.js
const Media = require('../models/Media');
const FamilyMember = require('../models/FamilyMember');
const Family = require('../models/Family');
const Post = require('../models/Post');
const PostFamily = require('../models/PostFamily');
const { sequelize } = require('../config/db');
const { upload, uploadFile, deleteFile } = require('../services/fileUpload');
const { Op } = require('sequelize');

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

      // Log file information for debugging
      console.log('Processing file upload:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Process file upload to S3
      const fileData = await uploadFile(req.file, req.user.id);
      
      console.log('File uploaded to S3:', {
        url: fileData.url,
        thumbUrl: fileData.thumbUrl,
        type: fileData.type
      });

      // Parse metadata if provided
      let metadata = {};
      try {
        if (req.body.metadata) {
          metadata = JSON.parse(req.body.metadata);
        }
      } catch (error) {
        console.warn('Invalid metadata format:', error.message);
      }

      // Create media record in database
      const media = await Media.create({
        url: fileData.url,
        thumbUrl: fileData.thumbUrl,
        type: fileData.type,
        name: fileData.name,
        size: fileData.size,
        mimeType: fileData.mimeType,
        metadata: metadata,
        uploadedById: req.user.id
      });

      // If familyId is provided, create a post with this media
      if (familyId) {
        const transaction = await sequelize.transaction();
        try {
          // Create a post for this media
          const post = await Post.create({
            content: metadata.description || `${req.user.firstName} shared ${fileData.type}`,
            mediaUrls: [fileData.url],
            type: 'regular',
            privacy: 'family',
            tags: metadata.tags || [],
            createdById: req.user.id
          }, { transaction });

          // Associate post with family
          await PostFamily.create({
            postId: post.id,
            familyId
          }, { transaction });

          await transaction.commit();
          
          // Include post information in the response
          media.setDataValue('post', post);
        } catch (error) {
          await transaction.rollback();
          console.error('Error creating associated post:', error);
        }
      }

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
    
    // Find posts associated with this family that contain media
    const posts = await Post.findAll({
      include: [
        {
          model: Family,
          through: { attributes: [] },
          as: 'families',
          where: { id: familyId },
          required: true
        }
      ],
      where: {
        mediaUrls: { [Op.ne]: [] } // Only posts with media
      }
    });
    
    // Extract media URLs from posts
    const mediaUrls = [];
    posts.forEach(post => {
      if (post.mediaUrls && post.mediaUrls.length > 0) {
        mediaUrls.push(...post.mediaUrls);
      }
    });
    
    // Query media records
    const queryOptions = {
      where: {
        url: { [Op.in]: mediaUrls }
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Post,
          as: 'posts',
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
  const transaction = await sequelize.transaction();
  
  try {
    const mediaId = req.params.id;
    
    // Get the media item
    const media = await Media.findByPk(mediaId, { transaction });
    
    if (!media) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }
    
    // Check if user is the uploader
    if (media.uploadedById !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this media'
      });
    }
    
    // Find posts that reference this media
    const posts = await Post.findAll({
      where: {
        mediaUrls: { [Op.contains]: [media.url] }
      },
      transaction
    });
    
    // Remove the media URL from posts
    for (const post of posts) {
      post.mediaUrls = post.mediaUrls.filter(url => url !== media.url);
      await post.save({ transaction });
    }
    
    // Delete physical files from S3
    const deleteResult = await deleteFile(media.url, media.thumbUrl);
    
    if (!deleteResult) {
      console.warn(`Warning: S3 deletion may have failed for media ${mediaId}`);
    }
    
    // Delete media record from database
    await media.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};