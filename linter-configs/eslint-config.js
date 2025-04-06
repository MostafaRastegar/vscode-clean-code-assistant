// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'sonarjs', // For complexity and duplicate code
    'eslint-plugin-import', // For dependency management
    'eslint-plugin-unicorn', // For modern JavaScript conventions
    'eslint-plugin-jsdoc', // For documentation
    'eslint-plugin-prefer-arrow', // For functional programming patterns
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:sonarjs/recommended',
    'plugin:unicorn/recommended',
  ],
  rules: {
    // COMPLEXITY RULES
    'complexity': ['error', { max: 10 }], // Maximum cyclomatic complexity
    'max-depth': ['error', { max: 3 }], // Maximum nesting depth
    'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
    'max-params': ['error', { max: 4 }], // Matches cleanCodeAssistant.maxParameterCount
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-duplicate-string': ['error', 3], // Matches cleanCodeAssistant.minStringLiteralOccurrences
    
    // NAMING CONVENTIONS
    '@typescript-eslint/naming-convention': [
      'error',
      // Class, interface, typeAlias, enum, typeParameter should use PascalCase
      {
        selector: ['class', 'interface', 'typeAlias', 'enum', 'typeParameter'],
        format: ['PascalCase'],
        leadingUnderscore: 'forbid',
      },
      // Variable should use camelCase, but UPPER_CASE for constants
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'forbid',
      },
      // Functions should use camelCase
      {
        selector: 'function',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
      },
      // Methods should use camelCase
      {
        selector: 'method',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
      },
      // Properties should use camelCase
      {
        selector: 'property',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
      },
      // Enforce minimum name length (except for common short names)
      {
        selector: ['variable', 'function', 'parameter'],
        format: null,
        custom: {
          regex: '^([a-zA-Z][a-zA-Z0-9_]{1,}|[iIjJkKxXyYzZ]|id|to|on|at)$',
          match: true,
        },
        leadingUnderscore: 'forbid',
      },
    ],
    'id-length': ['error', { min: 2, exceptions: ['i', 'j', 'k', 'x', 'y', 'z', 'id', 'to', 'on', 'at'] }],
    'max-len': ['error', { code: 120, ignoreComments: true, ignoreStrings: true, ignoreTemplateLiterals: true }],
    
    // SOLID PRINCIPLES (to the extent possible with static analysis)
    'max-classes-per-file': ['error', 1], // Single Responsibility Principle - one class per file
    'unicorn/consistent-function-scoping': 'error', // Helps with SRP for functions
    
    // ANTI-PATTERNS
    'no-param-reassign': 'error', // Avoid mutating parameters
    'no-magic-numbers': ['error', { ignore: [0, 1, -1], ignoreArrayIndexes: true }], // Avoid magic numbers
    'prefer-template': 'error', // Prefer template literals to string concatenation
    'unicorn/no-array-for-each': 'error', // Prefer functional array methods
    'unicorn/no-null': 'error', // Prefer undefined
    'unicorn/no-array-callback-reference': 'off', // This can be too restrictive
    'unicorn/prevent-abbreviations': 'off', // This can be too aggressive
    
    // FUNCTION DESIGN
    'prefer-arrow/prefer-arrow-functions': [
      'error',
      {
        disallowPrototype: true,
        singleReturnOnly: false,
        classPropertiesAllowed: false,
      },
    ],
    
    // DEAD CODE
    'no-unused-vars': 'off', // @typescript-eslint has better version
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // DOCUMENTATION
    'jsdoc/require-jsdoc': [
      'warn',
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
        },
      },
    ],
    'jsdoc/require-description': 'warn',
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-returns-description': 'warn',
  },
  overrides: [
    // Less strict rules for test files
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        'max-lines-per-function': 'off',
        'sonarjs/no-duplicate-string': 'off',
        'max-len': 'off',
      },
    },
  ],
};
