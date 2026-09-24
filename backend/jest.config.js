module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEach.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverage: false,
};
