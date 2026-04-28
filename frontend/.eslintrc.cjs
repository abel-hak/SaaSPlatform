module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react-refresh', '@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    // Warn on `any` usage so we gradually type things properly
    '@typescript-eslint/no-explicit-any': 'warn',
    // Ensure React components exported from modules can safely be updated with HMR
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // Prefer const where possible
    'prefer-const': 'error',
    // Catch unused variables (ignore underscore-prefixed ones)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Enforce consistent return types are explicit
    '@typescript-eslint/explicit-function-return-type': 'off',
    // Disable prop-types rule — TypeScript already handles this
    'react/prop-types': 'off',
  },
};
