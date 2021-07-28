module.exports = {
  root: false,
  overrides: [
    {
      files: ['**/*.ts'],
      rules: {
        // ts-mockito function capture requires unbound method reference
        '@typescript-eslint/unbound-method': 'off',
        // jest "each" tests require unsafe assignments and template expressions
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        // we use 'any' and member accesses from it in some tests
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
      },
    },
  ],
}
