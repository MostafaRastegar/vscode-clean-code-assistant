// src/analyzers/solidPrinciplesAnalyzer.ts
import * as vscode from "vscode";
import * as ts from "typescript";
import { CodeAnalyzer } from "./analyzerInterface";
import {
  AnalyzerResult,
  CodeIssue,
  IssueSeverity,
  IssueType,
} from "../models/codeIssue";

export class SolidPrinciplesAnalyzer implements CodeAnalyzer {
  id = "solid-principles";
  name = "SOLID Principles Analyzer";
  description = "Analyzes code for violations of SOLID principles";

  async analyze(document: vscode.TextDocument): Promise<AnalyzerResult> {
    const issues: CodeIssue[] = [];
    const content = document.getText();

    // Parse the document
    const sourceFile = ts.createSourceFile(
      document.fileName,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // Check for Single Responsibility Principle violations
    this.checkSingleResponsibility(sourceFile, document, issues);

    // Check for Open/Closed Principle violations
    this.checkOpenClosed(sourceFile, document, issues);

    // Check for Interface Segregation Principle violations
    this.checkInterfaceSegregation(sourceFile, document, issues);

    // Check for Dependency Inversion Principle violations
    this.checkDependencyInversion(sourceFile, document, issues);

    return { issues };
  }

  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    return config.get<boolean>("enableSolidPrinciplesAnalyzer", true);
  }

  /**
   * Checks for potential Single Responsibility Principle violations
   * - Classes with too many methods or properties
   * - Methods with too many lines
   */
  private checkSingleResponsibility(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[]
  ): void {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const maxClassMethods = config.get<number>("maxClassMethods", 10);
    const maxMethodLines = config.get<number>("maxMethodLines", 30);

    function visit(node: ts.Node) {
      // Check for large classes (too many methods)
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;

        // Count methods in the class
        const methods = node.members.filter(
          (member) =>
            ts.isMethodDeclaration(member) ||
            ts.isGetAccessor(member) ||
            ts.isSetAccessor(member)
        );

        if (methods.length > maxClassMethods) {
          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(node.name.getEnd());

          const issue: CodeIssue = {
            type: IssueType.SolidViolation,
            message: `Class "${className}" has ${methods.length} methods, which may violate the Single Responsibility Principle.`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Warning,
            suggestions: [
              "Break down the class into smaller classes with more focused responsibilities",
              "Consider extracting related methods into separate classes",
              "Use composition instead of putting all functionality in one class",
            ],
            documentation:
              "https://en.wikipedia.org/wiki/Single-responsibility_principle",
          };

          issues.push(issue);
        }
      }

      // Check for large methods (too many lines)
      if (
        (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) &&
        node.body
      ) {
        const startPos = node.body.getStart(sourceFile);
        const endPos = node.body.getEnd();
        const startLine = document.positionAt(startPos).line;
        const endLine = document.positionAt(endPos).line;
        const lineCount = endLine - startLine;

        if (lineCount > maxMethodLines) {
          let methodName = "anonymous method";

          if (node.name && ts.isIdentifier(node.name)) {
            methodName = node.name.text;
          }

          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(
            node.name ? node.name.getEnd() : node.getStart(sourceFile) + 8
          );

          const issue: CodeIssue = {
            type: IssueType.SolidViolation,
            message: `Method "${methodName}" has ${lineCount} lines, which may indicate it has too many responsibilities.`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Warning,
            suggestions: [
              "Break down the method into smaller methods with more focused responsibilities",
              "Extract helper methods for subtasks",
              "Consider using the Strategy pattern for different behaviors",
            ],
            documentation:
              "https://en.wikipedia.org/wiki/Single-responsibility_principle",
          };

          issues.push(issue);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  /**
   * Checks for potential Open/Closed Principle violations
   * - Large switch/case or if/else chains that switch on type
   */
  private checkOpenClosed(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[]
  ): void {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const maxCaseClauses = config.get<number>("maxCaseClauses", 5);

    function visit(node: ts.Node) {
      // Check for large switch statements
      if (ts.isSwitchStatement(node)) {
        const clauses = node.caseBlock.clauses;

        if (clauses.length > maxCaseClauses) {
          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(node.expression.getEnd());

          const issue: CodeIssue = {
            type: IssueType.SolidViolation,
            message: `Switch statement has ${clauses.length} cases, which may violate the Open/Closed Principle.`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Warning,
            suggestions: [
              "Consider using polymorphism instead of switch statements",
              "Apply the Strategy pattern to handle different behaviors",
              "Use a map of functions instead of a switch statement",
            ],
            documentation:
              "https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle",
          };

          issues.push(issue);
        }
      }

      // Check for large if-else chains that may be doing type checking
      if (ts.isIfStatement(node)) {
        let count = 1;
        let current: ts.Statement = node;

        // Count consecutive if-else statements
        while (ts.isIfStatement(current) && current.elseStatement) {
          if (ts.isIfStatement(current.elseStatement)) {
            count++;
            current = current.elseStatement;
          } else if (current.elseStatement) {
            count++;
            break;
          }
        }

        if (count > maxCaseClauses) {
          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(node.expression.getEnd());

          const issue: CodeIssue = {
            type: IssueType.SolidViolation,
            message: `If-else chain has ${count} conditions, which may violate the Open/Closed Principle.`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Warning,
            suggestions: [
              "Consider using polymorphism instead of type checking",
              "Apply the Strategy pattern to handle different behaviors",
              "Use a map of functions instead of if-else chains",
            ],
            documentation:
              "https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle",
          };

          issues.push(issue);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  /**
   * Checks for potential Interface Segregation Principle violations
   * - Interfaces with too many methods
   */
  private checkInterfaceSegregation(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[]
  ): void {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const maxInterfaceMethods = config.get<number>("maxInterfaceMethods", 5);

    function visit(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const interfaceName = node.name.text;
        const methods = node.members.filter((member) =>
          ts.isMethodSignature(member)
        );

        if (methods.length > maxInterfaceMethods) {
          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(node.name.getEnd());

          const issue: CodeIssue = {
            type: IssueType.SolidViolation,
            message: `Interface "${interfaceName}" has ${methods.length} methods, which may violate the Interface Segregation Principle.`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Warning,
            suggestions: [
              "Break down the interface into smaller, more focused interfaces",
              "Group related methods into separate interfaces",
              "Clients should not be forced to depend on methods they do not use",
            ],
            documentation:
              "https://en.wikipedia.org/wiki/Interface_segregation_principle",
          };

          issues.push(issue);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  /**
   * Checks for potential Dependency Inversion Principle violations
   * - Direct instantiation of concrete classes in constructors
   */
  private checkDependencyInversion(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[]
  ): void {
    function visit(node: ts.Node) {
      // Check for constructor methods
      if (
        ts.isConstructorDeclaration(node) &&
        node.parent &&
        ts.isClassDeclaration(node.parent)
      ) {
        const classNode = node.parent;
        let className = "anonymous class";

        if (classNode.name) {
          className = classNode.name.text;
        }

        // Check for "new" expressions in the constructor body
        if (node.body) {
          node.body.forEachChild((statement) => {
            findNewExpressions(statement, (newExpr, identifierName) => {
              const start = document.positionAt(newExpr.getStart(sourceFile));
              const end = document.positionAt(newExpr.getEnd());

              const issue: CodeIssue = {
                type: IssueType.SolidViolation,
                message: `Class "${className}" directly instantiates "${identifierName}" in its constructor, which may violate the Dependency Inversion Principle.`,
                range: new vscode.Range(start, end),
                severity: IssueSeverity.Information,
                suggestions: [
                  "Use dependency injection instead of direct instantiation",
                  "Depend on abstractions (interfaces) rather than concrete implementations",
                  "Consider using a factory or IoC container to create instances",
                ],
                documentation:
                  "https://en.wikipedia.org/wiki/Dependency_inversion_principle",
              };

              issues.push(issue);
            });
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    // Helper function to find "new" expressions
    function findNewExpressions(
      node: ts.Node,
      callback: (newExpr: ts.NewExpression, identifierName: string) => void
    ) {
      if (ts.isNewExpression(node) && node.expression) {
        let identifierName = "unknown type";

        if (ts.isIdentifier(node.expression)) {
          identifierName = node.expression.text;
        } else if (
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.name)
        ) {
          identifierName = node.expression.name.text;
        }

        callback(node, identifierName);
      }

      ts.forEachChild(node, (child) => findNewExpressions(child, callback));
    }

    visit(sourceFile);
  }
}
