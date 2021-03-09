module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    'plugin:prettier/recommended',
  ],
  rules: {
    'prefer-const': 'error',
    'no-unused-expressions': 'error',
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true,
      },
    ],
  },
}
