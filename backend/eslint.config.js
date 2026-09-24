const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  module: 'readonly',
  require: 'readonly',
  exports: 'readonly',
  Buffer: 'readonly',
  fetch: 'readonly',
  URLSearchParams: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
};

const testGlobals = {
  ...nodeGlobals,
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
};

module.exports = [
  js.configs.recommended,
  prettier,
  {
    ignores: ['node_modules/', 'dist/', 'coverage/'],
  },
  {
    languageOptions: {
      globals: nodeGlobals,
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
      'no-param-reassign': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: testGlobals,
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
];
