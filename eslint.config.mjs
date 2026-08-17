// eslint.config.mjs - flat config for ESLint 9+
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        node: true,
        es2022: true,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Add any project-specific linting rules here
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', '*.config.*'],
  }
);
