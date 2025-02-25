const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const familyValidation = require('../validations/familyValidations');

router.post('/', 
  protect,
  validate(familyValidation.createFamily),
  familyController.createFamily
);

router.get('/', 
  protect,
  familyController.getUserFamilies
);

router.put('/:familyId',
  protect,
  validate(familyValidation.updateFamily),
  familyController.updateFamily
);

router.post('/:familyId/members',
  protect,
  validate(familyValidation.addMember),
  familyController.addFamilyMember
);

module.exports = router;