module.exports = {
  root: true,
  extends: '@react-native',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',

    // React/React Native rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-native/no-inline-styles': 'warn',

    // General code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  overrides: [
    {
      // Test files configuration
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'src/test/**/*.ts', 'src/test/**/*.tsx'],
      plugins: ['vitest'],
      extends: ['plugin:vitest/recommended'],
      env: {
        'vitest/env': true,
      },
      rules: {
        // Allow any types in tests for mocking purposes
        '@typescript-eslint/no-explicit-any': 'off',
        // Allow console in tests
        'no-console': 'off',
        // Vitest-specific rules
        'vitest/expect-expect': 'error',
        'vitest/no-disabled-tests': 'warn',
        'vitest/no-focused-tests': 'error',
        'vitest/valid-expect': 'error',
      },
    },
  ],
};
