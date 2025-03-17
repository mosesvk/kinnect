// tests/e2e/family.test.js
// Update the imports and setup

// Replace the import at the top
const request = require('supertest');
const { sequelize } = require('../../src/config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import models directly rather than from Index
const User = require('../../src/models/User');
const Family = require('../../src/models/Family');
const FamilyMember = require('../../src/models/FamilyMember');

// Only import the app after setting NODE_ENV
process.env.NODE_ENV = 'test';
const app = require('../../src/server');

/**
 * Family API E2E Tests
 */
describe('Family API End-to-End Tests', () => {
  // Test data remains the same...
  
  // Update the beforeAll function:
  beforeAll(async () => {
    try {
      // Set test environment explicitly
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'test-secret-key';
      
      // Mocking sequelize methods instead of actual connection
      sequelize.authenticate = jest.fn().mockResolvedValue();
      sequelize.sync = jest.fn().mockResolvedValue();
      sequelize.close = jest.fn().mockResolvedValue();
      
      // Mock model functions
      User.destroy = jest.fn().mockResolvedValue();
      User.create = jest.fn().mockImplementation((data) => {
        return Promise.resolve({
          ...data,
          id: data.email.includes('admin') ? 'admin-id' : 'user-id'
        });
      });
      
      Family.destroy = jest.fn().mockResolvedValue();
      FamilyMember.destroy = jest.fn().mockResolvedValue();
      
      console.log('Mock database setup complete');
    } catch (error) {
      console.error('Database setup failed:', error);
    }
  });
  
  // Rest of the test file remains the same...