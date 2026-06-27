module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'node'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:node/recommended', 'prettier'],
  settings: {
    node: {
      tryExtensions: ['.js', '.ts', '.json'],
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-extraneous-import': 'off',
    'no-process-exit': 'off',
    'no-console': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', '.eslintrc.js'],
};
