// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userValidation = require('../validations/userValidations');
const validate = require('../middleware/validate');


// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'User routes are working' });
});


// Auth routes
router.post('/register', 
    validate(userValidation.register),
    userController.register
);

router.post('/login',
    validate(userValidation.login),
    userController.login
);

// Profile routes
router.put('/:id',
    validate(userValidation.updateProfile),
    userController.updateProfile
);

// Delete profile route - requires authentication
router.delete('/:id',
    protect,
    userController.deleteProfile
);

module.exports = router;