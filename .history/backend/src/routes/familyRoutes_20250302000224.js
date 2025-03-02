// routes/familyRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createFamily,
  getUserFamilies,
  getFamilyById,
  updateFamily,
  addFamilyMember,
  removeFamilyMember,
  deleteFamily
} = require('../controllers/familyController');

// Family routes
router.post('/', protect, createFamily);
router.get('/', protect, getUserFamilies);
router.get('/:id', protect, getFamilyById);
router.put('/:id', protect, updateFamily);
router.post('/:id/members', protect, addFamilyMember);
router.delete('/:id/members/:userId', protect, removeFamilyMember);
router.delete('/:id', protect, deleteFamily);

module.exports = router;