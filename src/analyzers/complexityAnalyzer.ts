// src/analyzers/complexityAnalyzer.ts
import * as vscode from "vscode";
import * as ts from "typescript";
import { CodeAnalyzer } from "./analyzerInterface";
import {
  AnalyzerResult,
  CodeIssue,
  IssueSeverity,
  IssueType,
} from "../models/codeIssue";
import { getFunctionInfo } from "../utils/astUtils";

export class ComplexityAnalyzer implements CodeAnalyzer {
  id = "complexity";
  name = "Complexity Analyzer";
  description = "Analyzes the cyclomatic complexity of functions and methods";

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

    // Get config
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const maxComplexity = config.get<number>("maxComplexity", 10);

    // Find all functions in the code
    const functions = this.findFunctions(sourceFile);

    // Analyze each function for complexity
    functions.forEach((func) => {
      const { node, name, complexity } = func;

      // If complexity exceeds the limit, report issue
      if (complexity > maxComplexity) {
        const start = document.positionAt(node.getStart(sourceFile));
        const end = document.positionAt(node.getEnd());

        const issue: CodeIssue = {
          type: IssueType.Complexity,
          message: `Function "${name}" has a complexity of ${complexity}, which exceeds the maximum of ${maxComplexity}`,
          range: new vscode.Range(start, end),
          severity: IssueSeverity.Warning,
          suggestions: [
            "Break down the function into smaller, more focused functions",
            "Refactor complex conditional logic into separate helper functions",
            "Consider using strategy pattern or command pattern for complex logic",
          ],
          documentation: "https://en.wikipedia.org/wiki/Cyclomatic_complexity",
        };

        issues.push(issue);
      }
    });

    return { issues };
  }

  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    return config.get<boolean>("enableComplexityAnalyzer", true);
  }

  private findFunctions(
    sourceFile: ts.SourceFile
  ): Array<{ node: ts.Node; name: string; complexity: number }> {
    const functions: Array<{
      node: ts.Node;
      name: string;
      complexity: number;
    }> = [];

    function visit(node: ts.Node) {
      // Check if the node is a function declaration, arrow function, or method
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
      ) {
        const info = getFunctionInfo(node, sourceFile);
        if (info) {
          functions.push({
            node,
            name: info.name,
            complexity: calculateComplexity(node),
          });
        }
      }

      // Continue traversing the AST
      ts.forEachChild(node, visit);
    }

    // Start traversal
    visit(sourceFile);

    return functions;
  }
}

/**
 * Calculates the cyclomatic complexity of a function
 * Complexity = 1 + number of branches (if, for, while, case, &&, ||, etc.)
 */
function calculateComplexity(node: ts.Node): number {
  let complexity = 1; // Base complexity

  function visit(node: ts.Node) {
    switch (node.kind) {
      // Control flow statements increase complexity
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression: // Ternary
        complexity++;
        break;

      // Logical expressions also increase complexity
      case ts.SyntaxKind.BinaryExpression:
        const binaryExpr = node as ts.BinaryExpression;
        if (
          binaryExpr.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken ||
          binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken
        ) {
          complexity++;
        }
        break;
    }

    // Continue traversing the AST
    ts.forEachChild(node, visit);
  }

  // Start traversal
  visit(node);

  return complexity;
}
