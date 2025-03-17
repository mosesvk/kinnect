// backend/jest.coverage.config.js
module.exports = {
    // Extend the base Jest config
    ...require('./tests/jest.config'),
    
    // Configure coverage collection
    collectCoverage: true,
    
    // Collect coverage from specific directories
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/server.js',
      '!src/config/**',
      '!**/node_modules/**',
      '!**/tests/**'
    ],
    
    // Configure coverage thresholds
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80
      },
      'src/controllers/userController.js': {
        branches: 80,
        functions: 90,
        lines: 90,
        statements: 90
      },
      'src/middleware/auth.js': {
        branches: 80,
        functions: 90,
        lines: 90,
        statements: 90
      }
    },
    
    // Configure coverage reports
    coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],
    
    // Configure coverage directory
    coverageDirectory: 'coverage'
  };