protect: jest.fn((req, res, next) => {
  // Check if authorization header exists
  if (req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')) {
    // Set user for authenticated requests
    req.user = {
      id: mockUserUUID,
      role: 'user'
    };
    next();
  } else {
    // Return 401 for unauthenticated requests
    res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
}),