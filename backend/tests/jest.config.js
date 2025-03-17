// jest.config.js
module.exports = {
    // The test environment that will be used for testing
    testEnvironment: 'node',
    
    // The glob patterns Jest uses to detect test files
    testMatch: [
      '**/__tests__/**/*.js',
      '**/?(*.)+(spec|test).js'
    ],
    
    // An array of regexp pattern strings that are matched against all test paths
    // Tests in the node_modules directory are ignored by default
    testPathIgnorePatterns: ['/node_modules/'],
    
    // A list of paths to directories that Jest should use to search for files in
    roots: ['<rootDir>'],
    
    // Indicates whether each individual test should be reported during the run
    verbose: true,
    
    // The directory where Jest should output its coverage files
    coverageDirectory: '<rootDir>/coverage',
    
    // Indicates which provider should be used to instrument code for coverage
    coverageProvider: 'v8',
    
    // A list of reporter names that Jest uses when writing coverage reports
    coverageReporters: ['text', 'lcov', 'clover'],
    
    // An array of glob patterns indicating a set of files for which coverage 
    // information should be collected
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/server.js',
      '!**/node_modules/**'
    ],
    
    // Setup files that will be executed before each test file
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // The maximum amount of workers used to run your tests
    maxWorkers: '50%',
    
    // An object that configures minimum threshold enforcement for coverage results
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    },
    
    // Automatically clear mock calls, instances, contexts and results before every test
    clearMocks: true,
    
    // Automatically restore mock state and implementation before every test
    restoreMocks: true
  };