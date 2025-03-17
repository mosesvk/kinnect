// src/routes/eventPostRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { getEventPosts } = require('../controllers/postController');

// Event post routes - using mergeParams to access eventId from parent router
router.get('/', protect, getEventPosts);

module.exports = router;