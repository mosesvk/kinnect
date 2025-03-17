// tests/integration/validations/familyValidations.test.js
const request = require("supertest");
const express = require("express");
const {
  validateFamilyCreation,
  validateFamilyUpdate,
  validateFamilyMemberAddition,
} = require("../../../src/validations/familyValidations");
const { createValidationTestApp } = require('../../helpers/validation-test-helper');

describe("Family Validations Integration Tests", () => {
  // Create a test app with all validations
  const testApp = createValidationTestApp({
    "family-create": validateFamilyCreation,
    "family-update": validateFamilyUpdate,
    "family-member-add": validateFamilyMemberAddition,
  });

  // Family Creation Validation tests (unchanged)
  describe("Family Creation Validation", () => {
    // ... existing tests unchanged
  });
  
  // Family Update Validation tests (unchanged)
  describe("Family Update Validation", () => {
    // ... existing tests unchanged
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