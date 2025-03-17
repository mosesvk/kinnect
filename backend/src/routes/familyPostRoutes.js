// src/routes/familyPostRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { getFamilyPosts } = require('../controllers/postController');

// Family post routes - using mergeParams to access familyId from parent router
router.get('/', protect, getFamilyPosts);

module.exports = router;