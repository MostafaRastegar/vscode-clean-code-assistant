# Clean Code Linting Setup

This document explains how to set up the linting system that enforces the same clean code principles as your VS Code extension.

## Overview

This setup consists of:

1. **ESLint Configuration**: Rules that enforce clean code principles
2. **Prettier**: For consistent code formatting
3. **Husky**: For running checks before commits
4. **Scripts**: Convenient npm scripts for running checks manually

## Installation

Install the required dependencies:

```bash
# Install ESLint and related plugins
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-plugin-import eslint-plugin-jsdoc eslint-plugin-prefer-arrow \
  eslint-plugin-sonarjs eslint-plugin-unicorn

# Install Prettier for formatting
npm install --save-dev prettier

# Install and set up Husky
npm install --save-dev husky
npm run prepare
```

## Rules Implemented

The ESLint configuration enforces the following clean code principles:

### Complexity Rules
- Maximum cyclomatic complexity: 10
- Maximum nesting depth: 3
- Maximum lines per function: 30
- Maximum parameters: 4
- Cognitive complexity checks
- Duplicate code detection

### Naming Conventions
- Classes/Interfaces: PascalCase
- Variables/Functions: camelCase
- Constants: UPPER_CASE
- Minimum name length: 2 (with exceptions for loop variables etc.)

### SOLID Principles
- One class per file (SRP)
- Consistent function scoping
- Additional patterns that support SOLID principles

### Anti-Patterns Detection
- No parameter reassignment
- No magic numbers
- Prefer template literals
- Prefer functional methods
- Many other anti-patterns

## How to Use

### Manual Checks

```bash
# Run ESLint to check code
npm run lint

# Run ESLint and automatically fix issues where possible
npm run lint:fix

# Check code formatting with Prettier
npm run format:check

# Format code with Prettier
npm run format

# Type-check the TypeScript code
npm run type-check
```

### Pre-commit Hooks

The pre-commit hook will automatically run:
1. ESLint with auto-fixes
2. TypeScript type checking

If any of these checks fail, the commit will be blocked until the issues are fixed.

## Customization

You can adjust the rules to match your preferences by modifying:

- `.eslintrc.js` - For code quality rules
- `.prettierrc` - For code formatting preferences

## Integration with CI/CD

You can add these checks to your CI/CD pipeline by adding the following to your workflow:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run type-check
```

## Troubleshooting

If you encounter issues with the linting setup:

1. Ensure all dependencies are installed correctly
2. Check the ESLint configuration matches your TypeScript setup
3. Run `npx eslint --debug src/file.ts` for detailed debugging information
