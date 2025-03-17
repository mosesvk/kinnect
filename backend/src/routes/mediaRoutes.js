// src/routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  uploadMedia,
  getUserMedia,
  deleteMedia
} = require('../controllers/mediaController');

// Media routes
router.post('/upload', protect, uploadMedia);
router.get('/', protect, getUserMedia);
router.delete('/:id', protect, deleteMedia);

module.exports = router;