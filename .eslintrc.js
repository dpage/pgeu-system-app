module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  ignorePatterns: ['archive/**/*', 'src-react-native/**/*', 'dist/**/*', 'build/**/*', 'node_modules/**/*', 'ios/**/*', 'android/**/*'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',

    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General code quality
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    {
      // Test files configuration
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'src/test/**/*.ts', 'src/test/**/*.tsx'],
      env: {
        jest: true,
      },
      rules: {
        // Allow any types in tests for mocking purposes
        '@typescript-eslint/no-explicit-any': 'off',
        // Allow console in tests
        'no-console': 'off',
      },
    },
  ],
};
