// tests/setup.js
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: './.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Global test timeout
jest.setTimeout(30000);

// Clean up resources after all tests
afterAll(async () => {
  // Any cleanup code if needed
});