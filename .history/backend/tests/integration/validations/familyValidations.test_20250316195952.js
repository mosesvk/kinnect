// tests/integration/validations/familyValidations.test.js
const request = require('supertest');
const express = require('express');
const { validateFamilyCreation, validateFamilyUpdate, validateFamilyMemberAddition } = require('../../../src/validations/familyValidations');
const validate = require('../../../src/middleware/validate');

// Mock JWT auth middleware
jest.mock('../../../src/middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

// Create express app for testing validations
const app = express();
app.use(express.json());

// Test routes with validation middleware
app.post('/test/family-create', validate(validateFamilyCreation), (req, res) => {
  res.json({ success: true, data: req.body });
});

app.put('/test/family-update', validate(validateFamilyUpdate), (req, res) => {
  res.json({ success: true, data: req.body });
});

app.post('/test/family-member-add', validate(validateFamilyMemberAddition), (req, res) => {
  res.json({ success: true, data: req.body });
});

describe('Family Validations Integration Tests', () => {
  describe('Family Creation Validation', () => {
    it('should pass validation with valid data', async () => {
      const validData = {
        name: 'Test Family',
        description: 'A family for testing',
        settings: {
          privacyLevel: 'private'
        }
      };

      const response = await request(app)
        .post('/test/family-create')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it('should fail validation when name is missing', async () => {
      const invalidData = {
        description: 'A family for testing'
      };

      const response = await request(app)
        .post('/test/family-create')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: 'Family name is required'
        })
      );
    });

    it('should fail validation when name is too short', async () => {
      const invalidData = {
        name: 'A', // Too short (less than 2 characters)
        description: 'A family for testing'
      };

      const response = await request(app)
        .post('/test/family-create')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: 'Family name must be between 2 and 100 characters'
        })
      );
    });

    it('should fail validation when description is too long', async () => {
      // Create a description that's over 500 characters
      const longDescription = 'A'.repeat(501);
      
      const invalidData = {
        name: 'Test Family',
        description: longDescription
      };

      const response = await request(app)
        .post('/test/family-create')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'description',
          message: 'Description cannot exceed 500 characters'
        })
      );
    });

    it('should fail validation when privacy level is invalid', async () => {
      const invalidData = {
        name: 'Test Family',
        description: 'A family for testing',
        settings: {
          privacyLevel: 'invalid-level'
        }
      };

      const response = await request(app)
        .post('/test/family-create')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'settings.privacyLevel',
          message: 'Privacy level must be private, public, or friends'
        })
      );
    });
  });

  describe('Family Update Validation', () => {
    it('should pass validation with valid update data', async () => {
      const validData = {
        name: 'Updated Family Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/test/family-update')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it('should pass validation with partial update data', async () => {
      const validData = {
        name: 'Only Update Name'
      };

      const response = await request(app)
        .put('/test/family-update')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it('should fail validation when name is empty', async () => {
      const invalidData = {
        name: ''
      };

      const response = await request(app)
        .put('/test/family-update')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: 'Family name cannot be empty if provided'
        })
      );
    });
  });

  describe('Family Member Addition Validation', () => {
    it('should pass validation with valid member data', async () => {
      const validData = {
        email: 'test@example.com',
        role: 'member',
        permissions: ['view', 'edit']
      };

      const response = await request(app)
        .post('/test/family-member-add')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it('should fail validation with invalid email', async () => {
      const invalidData = {
        email: 'not-an-email',
        role: 'member'
      };

      const response = await request(app)
        .post('/test/family-member-add')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Please provide a valid email'
        })
      );
    });

    it('should fail validation with invalid role', async () => {
      const invalidData = {
        email: 'test@example.com',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/test/family-member-add')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'role',
          message: 'Role must be admin, member, or viewer'
        })
      );
    });

    it('should fail validation when permissions is not an array', async () => {
      const invalidData = {
        email: 'test@example.com',
        role: 'member',
        permissions: 'view' // String instead of array
      };

      const response = await request(app)
        .post('/test/family-member-add')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: 'permissions',
          message: 'Permissions must be an array'
        })
      );
    });
  });
});