// src/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { 
  validatePostCreation, 
  validatePostUpdate, 
  validateComment 
} = require('../validations/postValidations');
const {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  addComment,
  getComments
} = require('../controllers/postController');

// Post routes
router.post('/', protect, validate(validatePostCreation), createPost);
router.get('/:id', protect, getPostById);
router.put('/:id', protect, validate(validatePostUpdate), updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/comments', protect, validate(validateComment), addComment);
router.get('/:id/comments', protect, getComments);

module.exports = router;