module.exports = {
  root: true,
  env: { browser: true, es2020: true, worker: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vitest.config.ts'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
    'import/default': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/no-duplicates': 'off',
    'import/order': 'off',
    'import/export': 'off'
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      },
      node: true
    }
  }
};
