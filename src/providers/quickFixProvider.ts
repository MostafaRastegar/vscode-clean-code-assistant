// src/providers/quickFixProvider.ts
import * as vscode from "vscode";
import { IssueType } from "../models/codeIssue";

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
      }

      // Add documentation action for all issue types
      this.addDocumentationAction(diagnostic, codeActions);
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

    // Add comment to suppress warning
    const addCommentAction = new vscode.CodeAction(
      "Add comment to suppress this warning",
      vscode.CodeActionKind.QuickFix
    );
    addCommentAction.edit = new vscode.WorkspaceEdit();

    // Get the line before the function
    const lineBeforeRange = new vscode.Range(
      new vscode.Position(diagnostic.range.start.line, 0),
      new vscode.Position(diagnostic.range.start.line, 0)
    );

    addCommentAction.edit.insert(
      document.uri,
      lineBeforeRange.start,
      "// clean-code-ignore: complexity\n"
    );

    addCommentAction.diagnostics = [diagnostic];
    codeActions.push(addCommentAction);
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
      `# راهنمای ساده رفع کد تکراری

3 روش اصلی برای رفع کد تکراری:

## 1. استخراج به یک تابع جدید

\`\`\`typescript
// قبل:
if (name.length < 2) return false;
if (!email.includes('@')) return false;

// بعد:
function validate(name, email) {
  if (name.length < 2) return false;
  if (!email.includes('@')) return false;
  return true;
}
\`\`\`

## 2. استفاده از یک آبجکت برای پارامترهای متعدد

\`\`\`typescript
// قبل:
function create(name, email, password, age) { ... }

// بعد:
function create(userData) { ... }
\`\`\`

## 3. استخراج منطق مشترک به یک کلاس جدید

\`\`\`typescript
// جدا کردن منطق اعتبارسنجی به یک کلاس validator
class UserValidator {
  validate(user) {
    // منطق اعتبارسنجی
  }
}
\`\`\`
`
    );

    guidedAction.diagnostics = [diagnostic];
    codeActions.push(guidedAction);

    // دکمه دوم برای دیدن مستندات کامل
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
    // ابتدا حروف بزرگ را تشخیص می‌دهیم تا بتوانیم کلمات در camelCase را پیدا کنیم
    // برای مثال: "userHandler" به "user Handler" تبدیل می‌شود
    const withSpaces = str.replace(/([A-Z])/g, " $1");

    return (
      withSpaces
        // حذف کاراکترهای غیرمجاز و جایگزینی با فاصله
        .replace(/[^a-zA-Z0-9]/g, " ")
        // تقسیم به کلمات
        .split(" ")
        // حذف رشته‌های خالی
        .filter((word) => word.length > 0)
        // حرف اول هر کلمه بزرگ، بقیه کوچک
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        // اتصال مجدد کلمات
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
