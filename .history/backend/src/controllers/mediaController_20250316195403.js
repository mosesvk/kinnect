// src/controllers/mediaController.js
const Media = require('../models/Media');
const FamilyMember = require('../models/FamilyMember');
const Family = require('../models/Family');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const multer = require('multer');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure local storage for development
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configure file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, MP4, MOV, PDF, DOC, and DOCX files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: process.env.NODE_ENV === 'production' ? multer.memoryStorage() : storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max file size
  }
});

// Helper to determine file type category
const getFileTypeCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

// Helper to generate thumbnails for images
const generateThumbnail = async (buffer, mimeType) => {
  if (!mimeType.startsWith('image/')) return null;
  
  try {
    const resizedBuffer = await sharp(buffer)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return resizedBuffer;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
};

// Helper to upload file to S3
const uploadToS3 = async (fileBuffer, key, mimeType) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    // Generate signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 * 7 });
    return url.split('?')[0]; // Return clean URL without signed params
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

// @desc    Upload media file
// @route   POST /api/media/upload
// @access  Private
exports.uploadMedia = async (req, res) => {
  try {
    // Multer middleware handles the file upload
    upload.single('file')(req, res, async (err) => {
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

      // Process the file
      let fileUrl;
      let thumbUrl = null;
      const fileType = getFileTypeCategory(req.file.mimetype);
      const fileKey = `${req.user.id}/${fileType}/${Date.now()}-${path.basename(req.file.originalname)}`;
      
      if (process.env.NODE_ENV === 'production') {
        // Upload to S3 in production
        fileUrl = await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);
        
        // Generate and upload thumbnail for images
        if (fileType === 'image') {
          const thumbBuffer = await generateThumbnail(req.file.buffer, req.file.mimetype);
          if (thumbBuffer) {
            const thumbKey = `${req.user.id}/${fileType}/thumbs/${Date.now()}-${path.basename(req.file.originalname)}`;
            thumbUrl = await uploadToS3(thumbBuffer, thumbKey, 'image/jpeg');
          }
        }
      } else {
        // Local file handling for development
        fileUrl = `/uploads/${req.file.filename}`;
        
        // Generate thumbnail for images
        if (fileType === 'image') {
          const thumbFilename = `thumb-${req.file.filename}`;
          const thumbPath = path.join(__dirname, '../../uploads', thumbFilename);
          
          try {
            await sharp(req.file.path)
              .resize(300, 300, { fit: 'inside' })
              .jpeg({ quality: 80 })
              .toFile(thumbPath);
            
            thumbUrl = `/uploads/${thumbFilename}`;
          } catch (error) {
            console.error('Error generating thumbnail:', error);
          }
        }
      }

      // Create media record in database
      const media = await Media.create({
        url: fileUrl,
        thumbUrl,
        type: fileType,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
        uploadedById: req.user.id
      });

      res.status(201).json({
        success: true,
        media
      });
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
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
    
    // Get media associated with the family's posts
    const mediaQuery = `
      SELECT DISTINCT m.*
      FROM "Media" m
      JOIN "Posts" p ON m."uploadedById" = p."createdById" AND p."mediaUrls" ? m."url"
      JOIN "PostFamilies" pf ON p."id" = pf."postId"
      WHERE pf."familyId" = :familyId
      ${type ? 'AND m."type" = :type' : ''}
      ORDER BY m."createdAt" DESC
      LIMIT :limit OFFSET :offset
    `;
    
    const countQuery = `
      SELECT COUNT(DISTINCT m."id")
      FROM "Media" m
      JOIN "Posts" p ON m."uploadedById" = p."createdById" AND p."mediaUrls" ? m."url"
      JOIN "PostFamilies" pf ON p."id" = pf."postId"
      WHERE pf."familyId" = :familyId
      ${type ? 'AND m."type" = :type' : ''}
    `;
    
    const replacements = {
      familyId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    if (type) {
      replacements.type = type;
    }
    
    const [media, countResult] = await Promise.all([
      sequelize.query(mediaQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
        model: Media,
        mapToModel: true
      }),
      sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      })
    ]);
    
    const count = parseInt(countResult[0]?.count || '0');
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
    
    // Delete from S3 if in production
    if (process.env.NODE_ENV === 'production') {
      // Extract the key from the URL
      const urlParts = media.url.split('/');
      const key = urlParts.slice(3).join('/');
      
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key
        }));
        
        // Delete thumbnail if exists
        if (media.thumbUrl) {
          const thumbUrlParts = media.thumbUrl.split('/');
          const thumbKey = thumbUrlParts.slice(3).join('/');
          
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: thumbKey
          }));
        }
      } catch (error) {
        console.error('S3 delete error:', error);
      }
    } else {
      // Delete local files in development
      try {
        const filePath = path.join(__dirname, '../..', media.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        if (media.thumbUrl) {
          const thumbPath = path.join(__dirname, '../..', media.thumbUrl);
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
          }
        }
      } catch (error) {
        console.error('File delete error:', error);
      }
    }
    
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

// Middleware for handling file uploads
exports.uploadMiddleware = upload.single('file');