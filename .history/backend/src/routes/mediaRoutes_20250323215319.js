// src/routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  uploadMedia,
  getUserMedia,
  deleteMedia, 
  getFamilyMedia
} = require('../controllers/mediaController');

// Media routes
// api/media
const mediaRouter = express.Router()
mediaRouter.post('/upload', protect, uploadMedia);
mediaRouter.get('/', protect, getUserMedia);
mediaRouter.delete('/:id', protect, deleteMedia);

// Family Media routes
// api/families/:familyId/media
router.get('/', protect, getFamilyMedia)

module.exports = { 
  familyMediaRoutes: router,
  mediaRoutes: mediaRouter
};