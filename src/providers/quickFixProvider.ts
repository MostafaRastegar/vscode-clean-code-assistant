// src/providers/quickFixProvider.ts
import * as vscode from "vscode";
import { IssueType } from "../models/codeIssue";
import { IgnoreCommentHandler } from "../utils/ignoreUtils";

/**
 * Provides code actions for fixing clean code issues
 */
export class CleanCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    // Get all diagnostics that are in the specified range
    const relevantDiagnostics = context.diagnostics.filter(
      (diagnostic) =>
        diagnostic.source === "Clean Code Assistant" &&
        diagnostic.range.intersection(range)
    );

    if (relevantDiagnostics.length === 0) {
      return undefined;
    }

    const codeActions: vscode.CodeAction[] = [];

    for (const diagnostic of relevantDiagnostics) {
      // Get the issue type from the diagnostic code
      const issueType = diagnostic.code as IssueType;

      // Generate actions based on the issue type
      switch (issueType) {
        case IssueType.Complexity:
          this.addComplexityActions(document, diagnostic, codeActions);
          break;

        case IssueType.Naming:
          this.addNamingActions(document, diagnostic, codeActions);
          break;

        case IssueType.DuplicateCode:
          this.addDuplicateCodeActions(document, diagnostic, codeActions);
          break;

        case IssueType.SolidViolation:
          this.addSolidViolationActions(document, diagnostic, codeActions);
          break;

        case IssueType.AntiPattern:
          this.addAntiPatternActions(document, diagnostic, codeActions);
          break;
      }

      // Add documentation action for all issue types
      this.addDocumentationAction(diagnostic, codeActions);

      // Add ignore comment actions for all issue types
      this.addIgnoreActions(document, diagnostic, codeActions, issueType);
    }

    return codeActions;
  }

  /**
   * Adds quick fixes for complexity issues
   */
  private addComplexityActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    codeActions: vscode.CodeAction[]
  ): void {
    // Extract function action
    const extractFunctionAction = new vscode.CodeAction(
      "Extract part of this function",
      vscode.CodeActionKind.QuickFix
    );
    extractFunctionAction.command = {
      title: "Extract Function",
      command: "clean-code-assistant.extractFunction",
      arguments: [document, diagnostic.range],
    };
    extractFunctionAction.diagnostics = [diagnostic];
    extractFunctionAction.isPreferred = true;
    codeActions.push(extractFunctionAction);
  }

  /**
   * Adds quick fixes for naming issues
   */
  private addNamingActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    codeActions: vscode.CodeAction[]
  ): void {
    // Extract the problematic name from the diagnostic message
    const nameMatch = diagnostic.message.match(/"([^"]+)"/);
    if (!nameMatch || !nameMatch[1]) {
      return;
    }

    const originalName = nameMatch[1];

    // Determine the correct naming convention based on the message
    let suggestedName = originalName;

    if (diagnostic.message.includes("camelCase")) {
      suggestedName = this.toCamelCase(originalName);
    } else if (diagnostic.message.includes("PascalCase")) {
      suggestedName = this.toPascalCase(originalName);
    } else if (diagnostic.message.includes("UPPER_SNAKE_CASE")) {
      suggestedName = this.toUpperSnakeCase(originalName);
    }

    // Only create a fix if we have a different suggested name
    if (suggestedName !== originalName) {
      const renameAction = new vscode.CodeAction(
        `Rename to "${suggestedName}"`,
        vscode.CodeActionKind.QuickFix
      );

      renameAction.edit = new vscode.WorkspaceEdit();

      // Create a range for the current name
      renameAction.edit.replace(document.uri, diagnostic.range, suggestedName);

      renameAction.diagnostics = [diagnostic];
      renameAction.isPreferred = true;

      codeActions.push(renameAction);
    }
  }

  /**
   * Adds quick fixes for duplicate code issues
   */
  private addDuplicateCodeActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    codeActions: vscode.CodeAction[]
  ): void {
    const guidedAction = new vscode.CodeAction(
      "Get quick guide for removing duplication",
      vscode.CodeActionKind.QuickFix
    );

    guidedAction.edit = new vscode.WorkspaceEdit();
    const tempUri = vscode.Uri.parse(`untitled:DRY-Guide-${Date.now()}.md`);

    guidedAction.edit.insert(
      tempUri,
      new vscode.Position(0, 0),
      `# Simple Guide to Remove Duplicate Code

3 main methods to remove duplicate code:

## 1. Extract to a new function

\`\`\`typescript
// Before:
if (name.length < 2) return false;
if (!email.includes('@')) return false;

// After:
function validate(name, email) {
  if (name.length < 2) return false;
  if (!email.includes('@')) return false;
  return true;
}
\`\`\`

## 2. Use an object for multiple parameters

\`\`\`typescript
// Before:
function create(name, email, password, age) { ... }

// After:
function create(userData) { ... }
\`\`\`

## 3. Extract common logic to a new class

\`\`\`typescript
// Separate validation logic into a validator class
class UserValidator {
  validate(user) {
    // Validation logic
  }
}
\`\`\`
`
    );

    guidedAction.diagnostics = [diagnostic];
    codeActions.push(guidedAction);

    // Second button to see full documentation
    const docAction = new vscode.CodeAction("Learn more about DRY Principle");
    docAction.command = {
      title: "Show DRY Documentation",
      command: "clean-code-assistant.showDocumentation",
      arguments: [{ issueType: IssueType.DuplicateCode }],
    };
    docAction.diagnostics = [diagnostic];
    codeActions.push(docAction);
  }

  /**
   * Adds quick fixes for SOLID principle violations
   */
  private addSolidViolationActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    codeActions: vscode.CodeAction[]
  ): void {
    // Different actions based on message content
    if (diagnostic.message.includes("Single Responsibility")) {
      const extractClassAction = new vscode.CodeAction(
        "Extract part of this class to a new class",
        vscode.CodeActionKind.QuickFix
      );
      extractClassAction.command = {
        title: "Extract Class",
        command: "clean-code-assistant.extractClass",
        arguments: [document, diagnostic.range],
      };
      extractClassAction.diagnostics = [diagnostic];
      codeActions.push(extractClassAction);
    }

    if (diagnostic.message.includes("Interface Segregation")) {
      const splitInterfaceAction = new vscode.CodeAction(
        "Split this interface into smaller interfaces",
        vscode.CodeActionKind.QuickFix
      );
      splitInterfaceAction.command = {
        title: "Split Interface",
        command: "clean-code-assistant.splitInterface",
        arguments: [document, diagnostic.range],
      };
      splitInterfaceAction.diagnostics = [diagnostic];
      codeActions.push(splitInterfaceAction);
    }

    if (diagnostic.message.includes("Open/Closed")) {
      const refactorAction = new vscode.CodeAction(
        "Refactor to use polymorphism instead of conditionals",
        vscode.CodeActionKind.QuickFix
      );
      refactorAction.command = {
        title: "Apply Strategy Pattern",
        command: "clean-code-assistant.applyStrategyPattern",
        arguments: [document, diagnostic.range],
      };
      refactorAction.diagnostics = [diagnostic];
      codeActions.push(refactorAction);
    }

    if (diagnostic.message.includes("Dependency Inversion")) {
      const injectDependencyAction = new vscode.CodeAction(
        "Use dependency injection instead of direct instantiation",
        vscode.CodeActionKind.QuickFix
      );
      injectDependencyAction.command = {
        title: "Apply Dependency Injection",
        command: "clean-code-assistant.applyDependencyInjection",
        arguments: [document, diagnostic.range],
      };
      injectDependencyAction.diagnostics = [diagnostic];
      codeActions.push(injectDependencyAction);
    }
  }

  /**
   * Adds quick fixes for anti-pattern issues
   */
  private addAntiPatternActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    codeActions: vscode.CodeAction[]
  ): void {
    // Add specific actions based on the anti-pattern type
    if (diagnostic.message.includes("God Object")) {
      const extractClassAction = new vscode.CodeAction(
        "Extract part of this class to a new class",
        vscode.CodeActionKind.QuickFix
      );
      extractClassAction.command = {
        title: "Extract Class",
        command: "clean-code-assistant.extractClass",
        arguments: [document, diagnostic.range],
      };
      extractClassAction.diagnostics = [diagnostic];
      codeActions.push(extractClassAction);
    }

    if (diagnostic.message.includes("Feature Envy")) {
      const moveMethodAction = new vscode.CodeAction(
        "Move method to more appropriate class",
        vscode.CodeActionKind.QuickFix
      );
      moveMethodAction.command = {
        title: "Extract Class",
        command: "clean-code-assistant.extractClass",
        arguments: [document, diagnostic.range],
      };
      moveMethodAction.diagnostics = [diagnostic];
      codeActions.push(moveMethodAction);
    }

    if (diagnostic.message.includes("Long Parameter List")) {
      const introParamObjectAction = new vscode.CodeAction(
        "Introduce Parameter Object",
        vscode.CodeActionKind.QuickFix
      );
      // This is a placeholder for future implementation
      introParamObjectAction.command = {
        title: "Extract Class",
        command: "clean-code-assistant.extractClass",
        arguments: [document, diagnostic.range],
      };
      introParamObjectAction.diagnostics = [diagnostic];
      codeActions.push(introParamObjectAction);
    }
  }

  /**
   * Adds actions to ignore issues via comments
   */
  private addIgnoreActions(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    codeActions: vscode.CodeAction[],
    issueType: IssueType
  ): void {
    // Add an action to suppress this specific issue type
    const ignoreAction = new vscode.CodeAction(
      `Ignore this ${this.getIssueTypeName(issueType)} issue`,
      vscode.CodeActionKind.QuickFix
    );
    ignoreAction.edit = new vscode.WorkspaceEdit();

    // Get the line before the issue
    const lineBeforeRange = new vscode.Range(
      new vscode.Position(diagnostic.range.start.line, 0),
      new vscode.Position(diagnostic.range.start.line, 0)
    );

    // Add the ignore comment
    ignoreAction.edit.insert(
      document.uri,
      lineBeforeRange.start,
      `${IgnoreCommentHandler.getIgnoreComment(issueType)}\n`
    );

    ignoreAction.diagnostics = [diagnostic];
    codeActions.push(ignoreAction);

    // Add an action to suppress all issues
    const ignoreAllAction = new vscode.CodeAction(
      "Ignore all clean code issues for this line",
      vscode.CodeActionKind.QuickFix
    );
    ignoreAllAction.edit = new vscode.WorkspaceEdit();

    // Add the ignore all comment
    ignoreAllAction.edit.insert(
      document.uri,
      lineBeforeRange.start,
      `${IgnoreCommentHandler.getIgnoreAllComment()}\n`
    );

    ignoreAllAction.diagnostics = [diagnostic];
    codeActions.push(ignoreAllAction);
  }

  /**
   * Returns a user-friendly name for the issue type
   */
  private getIssueTypeName(issueType: IssueType): string {
    switch (issueType) {
      case IssueType.Complexity:
        return "complexity";
      case IssueType.Naming:
        return "naming convention";
      case IssueType.DuplicateCode:
        return "duplicate code";
      case IssueType.SolidViolation:
        return "SOLID principle violation";
      case IssueType.AntiPattern:
        return "anti-pattern";
      default:
        return "clean code";
    }
  }

  /**
   * Adds an action to show documentation about the issue
   */
  private addDocumentationAction(
    diagnostic: vscode.Diagnostic,
    codeActions: vscode.CodeAction[]
  ): void {
    // If the diagnostic has a associated documentation, add an action to open it
    if (diagnostic.message.includes("http")) {
      const urlMatch = diagnostic.message.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch && urlMatch[1]) {
        const openDocAction = new vscode.CodeAction(
          "Learn more about this issue",
          vscode.CodeActionKind.QuickFix
        );
        openDocAction.command = {
          title: "Open Documentation",
          command: "vscode.open",
          arguments: [vscode.Uri.parse(urlMatch[1])],
        };
        openDocAction.diagnostics = [diagnostic];
        codeActions.push(openDocAction);
      }
    }
  }

  /**
   * Converts a string to camelCase
   */
  private toCamelCase(str: string): string {
    // First convert to PascalCase
    const pascal = this.toPascalCase(str);
    // Then convert first character to lowercase
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Converts a string to PascalCase
   */
  private toPascalCase(str: string): string {
    // First, detect uppercase letters to identify words in camelCase
    // For example: "userHandler" becomes "user Handler"
    const withSpaces = str.replace(/([A-Z])/g, " $1");

    return (
      withSpaces
        // Remove invalid characters and replace with space
        .replace(/[^a-zA-Z0-9]/g, " ")
        // Split into words
        .split(" ")
        // Remove empty strings
        .filter((word) => word.length > 0)
        // First letter of each word uppercase, rest lowercase
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        // Rejoin words
        .join("")
    );
  }

  /**
   * Converts a string to UPPER_SNAKE_CASE
   */
  private toUpperSnakeCase(str: string): string {
    return (
      str
        // Replace non-alphanumeric characters with spaces
        .replace(/[^a-zA-Z0-9]/g, " ")
        // Split into words
        .split(" ")
        // Filter out empty strings
        .filter((word) => word.length > 0)
        // Convert to uppercase
        .map((word) => word.toUpperCase())
        // Join with underscores
        .join("_")
    );
  }
}
