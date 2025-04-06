# Clean Code Assistant for VS Code

A VS Code extension that analyzes your JavaScript and TypeScript code in real-time, providing suggestions and warnings to help you write cleaner, more maintainable code.

![Clean Code Assistant Banner](assets/banner.png)

## Features

Clean Code Assistant helps you maintain high code quality by detecting common code smells and violations of clean code principles:

- **Complexity Analysis**: Identifies functions with high cyclomatic complexity
- **Naming Convention Checks**: Ensures your variables, functions, and classes follow consistent naming conventions
- **Duplicate Code Detection**: Finds repeated code blocks that could be refactored
- **SOLID Principles Guidance**: Detects violations of SOLID principles in your object-oriented code
- **Anti-Pattern Detection**: Identifies common anti-patterns like God Objects, Feature Envy, Primitive Obsession, and more
- **Quick-Fix Suggestions**: Provides actionable suggestions to improve your code
- **Detailed Documentation**: Includes comprehensive guides on clean code principles

### Interactive Dashboard

View a summary of code quality issues in your project through the Clean Code Assistant dashboard.

![Dashboard Screenshot](assets/dashboard.png)

### Clean Code Documentation

Access detailed explanations of clean code principles directly within VS Code.

![Documentation Screenshot](assets/documentation.png)

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Clean Code Assistant"
4. Click Install

## Requirements

- Visual Studio Code 1.54.0 or higher
- Workspace with JavaScript or TypeScript files

## Usage

The extension automatically analyzes your JavaScript and TypeScript files as you edit them. Issues are displayed as diagnostics in your editor.

1. Open the Clean Code Assistant sidebar by clicking its icon in the Activity Bar
2. View code issues in the Dashboard
3. Browse documentation in the Documentation panel
4. Hover over underlined code to see issue details and fix suggestions
5. Use the Quick Fix menu (Ctrl+. / Cmd+.) to apply suggested fixes

## Extension Settings

This extension contributes the following settings:

* `cleanCodeAssistant.enableComplexityAnalyzer`: Enable/disable complexity analysis
* `cleanCodeAssistant.maxComplexity`: Maximum allowed cyclomatic complexity (default: 10)
* `cleanCodeAssistant.enableNamingAnalyzer`: Enable/disable naming convention analysis
* `cleanCodeAssistant.minNameLength`: Minimum identifier length (default: 2)
* `cleanCodeAssistant.maxNameLength`: Maximum identifier length (default: 30)
* `cleanCodeAssistant.enableDuplicateCodeAnalyzer`: Enable/disable duplicate code analysis
* `cleanCodeAssistant.minDuplicateBlockSize`: Minimum lines for duplicate detection (default: 5)
* `cleanCodeAssistant.enableSolidPrinciplesAnalyzer`: Enable/disable SOLID principle analysis
* `cleanCodeAssistant.enableAntiPatternAnalyzer`: Enable/disable anti-pattern analysis

See extension settings for the complete list of configuration options.

## Commands

* `Clean Code Assistant: Analyze Code for Clean Code Issues`: Manually trigger code analysis
* `Clean Code Assistant: Show Clean Code Documentation`: Open the documentation panel
* `Clean Code Assistant: Refresh Dashboard`: Update the dashboard with the latest analysis


# Ignoring Code Issues

Clean Code Assistant provides a simple way to ignore specific code issues when they are intentionally written or cannot be refactored for valid reasons.

## How to Ignore Issues

You can ignore issues in your code by adding special comment directives:

```typescript
// clean-code-ignore: complexity
function complexFunction() {
  // This function has high complexity but we're intentionally ignoring it
  // ...
}

// clean-code-ignore: naming
const x = 10; // Short variable name is intentional here

// clean-code-ignore: all
class UserHandler { // This class intentionally ignores all clean code issues
  // ...
}
```

## Ignore Comment Format

- `// clean-code-ignore: [issue-type]` - Ignores a specific issue type (complexity, naming, duplicate-code, solid-violation, anti-pattern)
- `// clean-code-ignore: all` - Ignores all clean code issues for the code below

## Quick Fixes

For any reported issue, you can use Quick Fix (Ctrl+. / Cmd+.) to automatically add an ignore comment:

- "Ignore this [type] issue" - Adds a specific ignore comment for that issue type
- "Ignore all clean code issues for this line" - Adds a comment to ignore all issue types

## Configuration

You can customize ignore comments in settings:

- `cleanCodeAssistant.enableIgnoreComments` - Enable or disable support for ignore comments
- `cleanCodeAssistant.ignoreCommentFormat` - Format for ignore comments using the {type} placeholder
- `cleanCodeAssistant.includeCommentDescriptions` - Whether to include descriptive text in ignore comments

## Removing Ignore Comments

To remove ignore comments:

- Use "Clean Code: Remove ignore comments from current file" command for the current file
- Use "Clean Code: Remove ignore comments from all files" command for the entire workspace

These commands can be accessed from the Command Palette (Ctrl+Shift+P / Cmd+Shift+P).


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.