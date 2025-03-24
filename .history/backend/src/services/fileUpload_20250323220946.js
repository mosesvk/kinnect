// src/services/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Create uploads directory if it doesn't exist (for local storage)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// S3 configuration for production environments
let s3Client;
if (process.env.NODE_ENV === 'production') {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
} else {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Configure storage based on environment
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter to restrict uploads to specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    // Videos
    'video/mp4',
    'video/quicktime',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported`), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: multer.memoryStorage(), // Always use memory storage
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

/**
 * Determine file type category from MIME type
 * @param {string} mimeType - MIME type of the file
 * @returns {string} File type category
 */
const getFileTypeCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

/**
 * Generate a thumbnail for image files
 * @param {Buffer|string} input - Buffer or file path for the image
 * @param {string} mimeType - MIME type of the image
 * @returns {Promise<Buffer|null>} Thumbnail buffer or null if not an image
 */
const generateThumbnail = async (input, mimeType) => {
  if (!mimeType.startsWith('image/')) return null;

  try {
    return await sharp(input)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
};

/**
 * Upload a file to S3
 * @param {Object} file - File object from multer
 * @param {string} userId - ID of the user uploading the file
 * @returns {Promise<Object>} Object containing file URLs and metadata
 */
const uploadFile = async (file, userId) => {
  const fileType = getFileTypeCategory(file.mimetype);
  let fileUrl, thumbUrl = null;

  // Generate a unique key for the file
  const fileKey = `${userId}/${fileType}/${Date.now()}-${path.basename(file.originalname)}`;
  
  // Upload to S3
  const fileBuffer = file.buffer || fs.readFileSync(file.path);
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: file.mimetype,
  };

  // Upload original file
  await s3Client.send(new PutObjectCommand(params));
  
  // Set the file URL (without signed URL to avoid expiration)
  fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

  // Generate and upload thumbnail for images
  if (fileType === 'image') {
    try {
      const thumbBuffer = await generateThumbnail(fileBuffer, file.mimetype);
      if (thumbBuffer) {
        const thumbKey = `${userId}/${fileType}/thumbs/${Date.now()}-${path.basename(file.originalname)}`;
        const thumbParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: thumbKey,
          Body: thumbBuffer,
          ContentType: 'image/jpeg',
        };
        await s3Client.send(new PutObjectCommand(thumbParams));
        
        // Set thumbnail URL
        thumbUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbKey}`;
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }
  }

  // Clean up local file if it exists
  if (file.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }

  return {
    url: fileUrl,
    thumbUrl,
    type: fileType,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };
};

/**
 * Delete a file from S3
 * @param {string} fileUrl - URL of the file to delete
 * @param {string} thumbUrl - URL of the thumbnail to delete (optional)
 * @returns {Promise<boolean>} Success status
 */
const deleteFile = async (fileUrl, thumbUrl = null) => {
  try {
    if (fileUrl) {
      // Extract key from URL
      const fileKey = fileUrl.split('.amazonaws.com/')[1];
      if (fileKey) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: fileKey,
        }));
      }
    }

    if (thumbUrl) {
      // Extract key from URL
      const thumbKey = thumbUrl.split('.amazonaws.com/')[1];
      if (thumbKey) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: thumbKey,
        }));
      }
    }
    return true;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};

module.exports = {
  upload,
  uploadFile,
  deleteFile,
  getFileTypeCategory,
};