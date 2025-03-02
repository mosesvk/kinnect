const express = require('express');
const { connectDB } = require('./config/db');
const { syncDatabase } = require('./models/Index');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const familyRoutes = require('./routes/familyRoutes')
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS with more explicit options
app.use(cors({
  origin: '*', // During development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure Helmet but disable content security policy for development
app.use(helmet({
  contentSecurityPolicy: false
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Welcome route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Family App API',
    version: '1.0.0'
  });
});

app.post('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working'
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/families', familyRoutes);

// Add other routes as needed

// Error handling middleware
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Connect to database and start server
const start = async () => {
  try {
    await connectDB();
    await syncDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port: ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();