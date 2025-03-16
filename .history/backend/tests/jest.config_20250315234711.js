module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/server.js',
      '!**/node_modules/**',
      '!**/vendor/**'
    ],
    coverageReporters: ['text', 'lcov', 'clover'],
    testPathIgnorePatterns: ['/node_modules/'],
    setupFilesAfterEnv: ['./tests/setup.js']
  };