// src/routes/familyMediaRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const { getFamilyMedia } = require('../controllers/mediaController');

// Family media routes - using mergeParams to access familyId from parent router
router.get('/', protect, getFamilyMedia);

module.exports = router;