const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const familyValidation = require('../validations/familyValidations');

// Create a family
router.post('/', 
  protect,
  validate(familyValidation.createFamily),
  familyController.createFamily
);

// Get all families for current user
router.get('/', 
  protect,
  familyController.getUserFamilies
);

// Join family with invitation code
router.post(
  '/join',
  protect,
  validate(familyValidation.joinFamily),
  familyController.joinFamily
);

// Update family details
router.put('/:familyId',
  protect,
  validate(familyValidation.updateFamily),
  familyController.updateFamily
);

// Add a member to family
router.post('/:familyId/members',
  protect,
  validate(familyValidation.addMember),
  familyController.addFamilyMember
);

// Remove a member from family
router.delete('/:familyId/members/:memberId',
  protect,
  familyController.removeFamilyMember
);

module.exports = router;