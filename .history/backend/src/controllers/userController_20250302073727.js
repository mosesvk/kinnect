// src/controllers/userController.js (key parts)

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
exports.registerUser = async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      
      // Check if user exists
      const userExists = await User.findOne({ where: { email } });
      
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }
      
      // Create user (with password hashing handled by the model hooks)
      const user = await User.create({
        firstName,
        lastName,
        email,
        passwordHash: password // Will be hashed by model hooks
      });
      
      // Return user with token
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          token: generateToken(user.id)
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };
  
  // @desc    Login user
  // @route   POST /api/users/login
  // @access  Public
  exports.loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await User.findOne({ where: { email } });
      
      // Check if user exists and password matches
      if (user && (await user.matchPassword(password))) {
        // Update last login time
        user.lastLogin = new Date();
        await user.save();
        
        res.json({
          success: true,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            token: generateToken(user.id)
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  };