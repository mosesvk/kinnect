// jest.config.js
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!**/node_modules/**",
    "!**/tests/**",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ["./tests/setupTests.js"],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
};

// tests/setupTests.js
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.PORT = 5001;

// Mock AWS SDK services
jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

jest.mock("@aws-sdk/s3-request-presigner", () => {
  return {
    getSignedUrl: jest
      .fn()
      .mockResolvedValue("https://test-signed-url.com/test"),
  };
});

// Mock multer for file uploads
jest.mock("multer", () => {
  const multerMock = () => {
    return {
      single: () => (req, res, next) => {
        req.file = {
          fieldname: "file",
          originalname: "test-file.jpg",
          encoding: "7bit",
          mimetype: "image/jpeg",
          size: 12345,
          destination: "/tmp",
          filename: "test-file-123.jpg",
          path: "/tmp/test-file-123.jpg",
          buffer: Buffer.from("test file content"),
        };
        next();
      },
    };
  };
  multerMock.memoryStorage = jest.fn(() => ({}));
  multerMock.diskStorage = jest.fn(() => ({}));
  return multerMock;
});

// Mock sharp for image processing
jest.mock("sharp", () => {
  return jest.fn().mockImplementation(() => {
    return {
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("thumbnail content")),
      toFile: jest.fn().mockResolvedValue({}),
    };
  });
});

// Global afterAll handler to close any open handles
afterAll(async () => {
  // Using a small timeout to allow any pending operations to complete
  await new Promise((resolve) => setTimeout(resolve, 500));
});
