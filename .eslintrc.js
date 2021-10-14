module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.js'],
      extends: 'eslint:recommended',
      parserOptions: { ecmaVersion: 2018 },
      env: { node: true },
    },
    {
      files: "src/**/*.ts",
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.eslint.json'
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
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
        '@typescript-eslint/unbound-method': [
          'error',
          {
            'ignoreStatic': true
          }
        ]
      },
    },
    {
      files: "test/**/*.ts",
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.eslint.json'
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'prettier', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        'plugin:prettier/recommended',
      ],
      rules: {
        'prefer-const': 'error',
        'no-unused-expressions': 'error',
        '@typescript-eslint/no-unsafe-argument': 'off',
        quotes: [
          'error',
          'single',
          {
            avoidEscape: true,
          },
        ],
        '@typescript-eslint/unbound-method': [
          'error',
          {
            'ignoreStatic': true
          }
        ]
      },
    }
  ]
}
