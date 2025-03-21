// tests/integration/validations/familyValidations.test.js
const request = require("supertest");
const express = require("express");
const {
  validateFamilyCreation,
  validateFamilyUpdate,
  validateFamilyMemberAddition,
} = require("../../../src/validations/familyValidations");
const { createValidationTestApp } = require('../../helpers/validation-test-helper');
const validate = require("../../../src/middleware/validate");

// Create a custom validation middleware for testing that formats errors correctly
const validateWithFormat = (validations) => {
  return async (req, res, next) => {
    try {
      // Execute all validations
      for (const validation of validations) {
        await validation.run(req);
      }

      // Get validation errors
      const errors = validations
        .map((validation) => validation.errors)
        .flat()
        .filter(Boolean);

      if (errors.length > 0) {
        // Format errors to match test expectations
        const formattedErrors = errors.map((err) => ({
          field: err.path,
          message: err.msg,
        }));

        return res.status(400).json({
          success: false,
          errors: formattedErrors,
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }
  };
};

// Mock JWT auth middleware
jest.mock("../../../src/middleware/auth", () => ({
  protect: (req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  },
}));

// Create express app for testing validations
const app = express();
app.use(express.json());

// Test routes with validation middleware
app.post(
  "/test/family-create",
  validateWithFormat(validateFamilyCreation),
  (req, res) => {
    res.json({ success: true, data: req.body });
  }
);

app.put(
  "/test/family-update",
  validateWithFormat(validateFamilyUpdate),
  (req, res) => {
    res.json({ success: true, data: req.body });
  }
);

app.post(
  "/test/family-member-add",
  validateWithFormat(validateFamilyMemberAddition),
  (req, res) => {
    res.json({ success: true, data: req.body });
  }
);

describe("Family Validations Integration Tests", () => {
  // Create a test app with all validations
  const testApp = createValidationTestApp({
    "family-create": validateFamilyCreation,
    "family-update": validateFamilyUpdate,
    "family-member-add": validateFamilyMemberAddition,
  });

  describe("Family Creation Validation", () => {
    it("should pass validation with valid data", async () => {
      const validData = {
        name: "Test Family",
        description: "A family for testing",
        settings: {
          privacyLevel: "private",
        },
      };

      const response = await request(testApp)
        .post("/test/family-create")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it("should fail validation when name is missing", async () => {
      const invalidData = {
        description: "A family for testing",
      };

      const response = await request(testApp)
        .post("/test/family-create")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "name",
          message: "Family name is required",
        })
      );
    });

    // Other tests remain unchanged
  });
  
  describe("Family Update Validation", () => {
    it("should pass validation with valid update data", async () => {
      const validData = {
        name: "Updated Family Name",
        description: "Updated description",
      };

      const response = await request(testApp)
        .post("/test/family-update")  // Changed from PUT to POST to match helper
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it("should pass validation with partial update data", async () => {
      const validData = {
        name: "Only Update Name",
      };

      const response = await request(testApp)
        .post("/test/family-update")  // Changed from PUT to POST
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it("should fail validation when name is empty", async () => {
      const invalidData = {
        name: "",
      };

      const response = await request(testApp)
        .post("/test/family-update")  // Changed from PUT to POST
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "name",
          message: "Family name cannot be empty if provided",
        })
      );
    });
  });

  describe("Family Member Addition Validation", () => {
    it("should pass validation with valid member data", async () => {
      const validData = {
        email: "test@example.com",
        role: "member",
        permissions: ["view", "edit"],
      };

      const response = await request(testApp)
        .post("/test/family-member-add")
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it("should fail validation with invalid email", async () => {
      const invalidData = {
        email: "not-an-email",
        role: "member",
      };

      const response = await request(testApp)
        .post("/test/family-member-add")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "email",
          message: "Please provide a valid email",
        })
      );
    });

    it("should fail validation with invalid role", async () => {
      const invalidData = {
        email: "test@example.com",
        role: "invalid-role",
      };

      const response = await request(testApp)
        .post("/test/family-member-add")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "role",
          message: "Role must be admin, member, or viewer",
        })
      );
    });

    it("should fail validation when permissions is not an array", async () => {
      const invalidData = {
        email: "test@example.com",
        role: "member",
        permissions: "view", // String instead of array
      };

      const response = await request(testApp)
        .post("/test/family-member-add")
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          field: "permissions",
          message: "Permissions must be an array",
        })
      );
    });
  });
});
