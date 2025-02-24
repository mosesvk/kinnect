const { body } = require('express-validator');

const familyValidation = {
  createFamily: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Family name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Family name must be between 2 and 50 characters'),
    body('settings.privacyLevel')
      .optional()
      .isIn(['private', 'members', 'public'])
      .withMessage('Invalid privacy level')
  ],

  updateFamily: [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 2, max: 50 })
      .withMessage('Family name must be between 2 and 50 characters'),
    body('settings.privacyLevel')
      .optional()
      .isIn(['private', 'members', 'public'])
      .withMessage('Invalid privacy level')
  ],

  addMember: [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required'),
    body('role')
      .isIn(['admin', 'member', 'guardian', 'child'])
      .withMessage('Invalid role'),
    body('permissions')
      .isArray()
      .withMessage('Permissions must be an array')
      .custom(permissions => 
        permissions.every(p => ['read', 'write', 'admin'].includes(p))
      )
      .withMessage('Invalid permissions')
  ]
};

module.exports = familyValidation;