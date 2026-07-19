const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '.next/**',
      '.netlify/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      '**/*.d.ts',
      'pnpm-lock.yaml',
      'package-lock.json',
      '.pnpm-store/**',
      'src/__tests__/**',
      'scripts/**',
      '*.config.ts',
      'playwright.config.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}', 'middleware.ts'],
    languageOptions: {
      globals: {
        React: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'warn',
    },
  },
  tseslint.configs.recommended[0],
);
