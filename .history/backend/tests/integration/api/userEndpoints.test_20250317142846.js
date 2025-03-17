// tests/integration/api/userEndpoints.test.js

const request = require('supertest');
const app = require('../../../src/server');
const { sequelize } = require('../../../src/config/db');
const User = require('../../../src/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.setTimeout(30000);

describe('User API Endpoints', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testUserEmail;
  let adminUserEmail;

  // Helper functions
  const generateRandomEmail = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `test${timestamp}${random}@example.com`;
  };

  // Generate JWT token for testing
  const generateToken = (userId) => {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  };

  // Setup before all tests
  beforeAll(async () => {
    try {
      // Connect to test database
      await sequelize.authenticate();
      
      // Use transactions for test isolation
      const transaction = await sequelize.transaction();
      
      try {
        // Create random emails for test users
        testUserEmail = generateRandomEmail();
        adminUserEmail = generateRandomEmail();

        // Create regular test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        testUser = await User.create({
          firstName: 'Test',
          lastName: 'User',
          email: testUserEmail,
          passwordHash: hashedPassword,
          role: 'user'
        }, { transaction });

        // Create admin test user
        const adminHashedPassword = await bcrypt.hash('admin123', 10);
        adminUser = await User.create({
          firstName: 'Admin',
          lastName: 'User',
          email: adminUserEmail,
          passwordHash: adminHashedPassword,
          role: 'admin'
        }, { transaction });

        await transaction.commit();
        
        // Generate tokens
        userToken = generateToken(testUser.id);
        adminToken = generateToken(adminUser.id);
        
        console.log('Test setup completed successfully');
      } catch (error) {
        await transaction.rollback();
        console.error('Test setup failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }