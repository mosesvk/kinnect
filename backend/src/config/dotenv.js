// src/config/dotenv.js
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables based on NODE_ENV
const loadEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  
  let envPath;
  
  if (env === 'test') {
    envPath = path.resolve(process.cwd(), '.env.test');
  } else if (env === 'production') {
    envPath = path.resolve(process.cwd(), '.env.production');
  } else {
    envPath = path.resolve(process.cwd(), '.env');
  }
  
  // Load the appropriate .env file
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.warn(`Warning: ${envPath} not found, falling back to default .env`);
    dotenv.config(); // Fall back to default .env file
  }
  
  // Ensure critical environment variables are set
  const requiredVars = ['JWT_SECRET'];
  
  if (env !== 'test') {
    requiredVars.push('DB_NAME', 'DB_USER', 'DB_HOST');
  }
  
  const missingVars = requiredVars.filter(key => !process.env[key]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
    
    // In test environment, set default values for essential variables
    if (env === 'test') {
      if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key';
    }
  }
  
  console.log(`Environment loaded: ${env}`);
};

module.exports = { loadEnv };