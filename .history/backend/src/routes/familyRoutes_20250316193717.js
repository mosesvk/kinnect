// routes/familyRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateFamilyCreation,
  validateFamilyUpdate,
  validateFamilyMemberAddition
} = require('../validations/familyValidations');
const {
  createFamily,
  getUserFamilies,
  getFamilyById,
  updateFamily,
  addFamilyMember,
  removeFamilyMember,
  deleteFamily
} = require('../controllers/familyController');

// Family routes with validation
router.post('/', protect, validate(validateFamilyCreation), createFamily);
router.get('/', protect, getUserFamilies);
router.get('/:id', protect, getFamilyById);
router.put('/:id', protect, validate(validateFamilyUpdate), updateFamily);
router.post('/:id/members', protect, validate(validateFamilyMemberAddition), addFamilyMember);
router.delete('/:id/members/:userId', protect, removeFamilyMember);
router.delete('/:id', protect, deleteFamily);

module.exports = router;