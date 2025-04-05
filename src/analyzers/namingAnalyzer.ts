// src/analyzers/namingAnalyzer.ts
import * as vscode from "vscode";
import * as ts from "typescript";
import { CodeAnalyzer } from "./analyzerInterface";
import {
  AnalyzerResult,
  CodeIssue,
  IssueSeverity,
  IssueType,
} from "../models/codeIssue";

export class NamingAnalyzer implements CodeAnalyzer {
  id = "naming";
  name = "Naming Analyzer";
  description =
    "Analyzes variable, function, and class names for clean code principles";

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
    const minNameLength = config.get<number>("minNameLength", 2);
    const maxNameLength = config.get<number>("maxNameLength", 30);

    // Search for all identifiers in the code
    this.findIdentifiers(sourceFile).forEach((identifier) => {
      const { node, name, kind } = identifier;

      // Check if the name is too short
      if (name.length < minNameLength && !this.isExemptFromMinLength(name)) {
        const start = document.positionAt(node.getStart(sourceFile));
        const end = document.positionAt(node.getEnd());

        const issue: CodeIssue = {
          type: IssueType.Naming,
          message: `${this.getKindName(kind)} name "${name}" is too short (${
            name.length
          }). Names should be at least ${minNameLength} characters.`,
          range: new vscode.Range(start, end),
          severity: IssueSeverity.Warning,
          suggestions: [
            "Use descriptive names that convey meaning and intent",
            "Avoid single letter names except for simple loop counters",
          ],
        };

        issues.push(issue);
      }

      // Check if the name is too long
      if (name.length > maxNameLength) {
        const start = document.positionAt(node.getStart(sourceFile));
        const end = document.positionAt(node.getEnd());

        const issue: CodeIssue = {
          type: IssueType.Naming,
          message: `${this.getKindName(kind)} name "${name}" is too long (${
            name.length
          }). Names should be no more than ${maxNameLength} characters.`,
          range: new vscode.Range(start, end),
          severity: IssueSeverity.Information,
          suggestions: [
            "Use shorter but still descriptive names",
            "Break down complex entities into smaller parts",
          ],
        };

        issues.push(issue);
      }

      // Check if name follows naming convention based on type
      if (!this.followsNamingConvention(name, kind)) {
        const start = document.positionAt(node.getStart(sourceFile));
        const end = document.positionAt(node.getEnd());

        const convention = this.getConventionForKind(kind);

        const issue: CodeIssue = {
          type: IssueType.Naming,
          message: `${this.getKindName(
            kind
          )} name "${name}" does not follow the ${convention} naming convention.`,
          range: new vscode.Range(start, end),
          severity: IssueSeverity.Information,
          suggestions: [
            `Use ${convention} for ${this.getKindName(kind)} names`,
            this.getSuggestionForKind(kind, name),
          ],
        };

        issues.push(issue);
      }
    });

    return { issues };
  }

  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    return config.get<boolean>("enableNamingAnalyzer", true);
  }

  private findIdentifiers(
    sourceFile: ts.SourceFile
  ): Array<{ node: ts.Node; name: string; kind: NamingKind }> {
    const identifiers: Array<{
      node: ts.Node;
      name: string;
      kind: NamingKind;
    }> = [];

    function visit(node: ts.Node) {
      // Check for variable declarations
      if (
        ts.isVariableDeclaration(node) &&
        node.name &&
        ts.isIdentifier(node.name)
      ) {
        // Check if it's a constant (from parent const declaration)
        let isConst = false;
        if (
          node.parent &&
          node.parent.parent &&
          ts.isVariableDeclarationList(node.parent) &&
          node.parent.flags & ts.NodeFlags.Const
        ) {
          isConst = true;
        }

        identifiers.push({
          node: node.name,
          name: node.name.text,
          kind: isConst ? NamingKind.Constant : NamingKind.Variable,
        });
      }

      // Check for function declarations
      else if (ts.isFunctionDeclaration(node) && node.name) {
        identifiers.push({
          node: node.name,
          name: node.name.text,
          kind: NamingKind.Function,
        });
      }

      // Check for class declarations
      else if (ts.isClassDeclaration(node) && node.name) {
        identifiers.push({
          node: node.name,
          name: node.name.text,
          kind: NamingKind.Class,
        });
      }

      // Check for method declarations
      else if (ts.isMethodDeclaration(node) && node.name) {
        const nameNode = node.name;
        let methodName = "";

        if (ts.isIdentifier(nameNode)) {
          methodName = nameNode.text;
        } else if (ts.isStringLiteral(nameNode)) {
          methodName = nameNode.text;
        }

        if (methodName) {
          identifiers.push({
            node: nameNode,
            name: methodName,
            kind: NamingKind.Method,
          });
        }
      }

      // Check for parameter declarations
      else if (
        ts.isParameter(node) &&
        node.name &&
        ts.isIdentifier(node.name)
      ) {
        identifiers.push({
          node: node.name,
          name: node.name.text,
          kind: NamingKind.Parameter,
        });
      }

      // Check for property declarations
      else if (
        ts.isPropertyDeclaration(node) &&
        node.name &&
        ts.isIdentifier(node.name)
      ) {
        identifiers.push({
          node: node.name,
          name: node.name.text,
          kind: NamingKind.Property,
        });
      }

      // Check for interface declarations
      else if (ts.isInterfaceDeclaration(node) && node.name) {
        identifiers.push({
          node: node.name,
          name: node.name.text,
          kind: NamingKind.Interface,
        });
      }

      // Continue traversing the AST
      ts.forEachChild(node, visit);
    }

    // Start traversal
    visit(sourceFile);

    return identifiers;
  }

  private isExemptFromMinLength(name: string): boolean {
    // Common exceptions for short names (e.g., i, j, k for loops, id, etc.)
    const exceptions = ["i", "j", "k", "x", "y", "z", "id", "to", "on", "at"];
    return exceptions.includes(name);
  }

  private followsNamingConvention(name: string, kind: NamingKind): boolean {
    switch (kind) {
      case NamingKind.Class:
      case NamingKind.Interface:
        // Classes and interfaces should use PascalCase
        return /^[A-Z][a-zA-Z0-9]*$/.test(name);

      case NamingKind.Function:
      case NamingKind.Method:
      case NamingKind.Variable:
      case NamingKind.Parameter:
      case NamingKind.Property:
        // Functions, methods, variables, parameters should use camelCase
        return /^[a-z][a-zA-Z0-9]*$/.test(name);

      case NamingKind.Constant:
        // Constants should use UPPER_SNAKE_CASE
        return /^[A-Z][A-Z0-9_]*$/.test(name);

      default:
        return true;
    }
  }

  private getKindName(kind: NamingKind): string {
    switch (kind) {
      case NamingKind.Class:
        return "Class";
      case NamingKind.Interface:
        return "Interface";
      case NamingKind.Function:
        return "Function";
      case NamingKind.Method:
        return "Method";
      case NamingKind.Variable:
        return "Variable";
      case NamingKind.Parameter:
        return "Parameter";
      case NamingKind.Property:
        return "Property";
      case NamingKind.Constant:
        return "Constant";
      default:
        return "Identifier";
    }
  }

  private getConventionForKind(kind: NamingKind): string {
    switch (kind) {
      case NamingKind.Class:
      case NamingKind.Interface:
        return "PascalCase";

      case NamingKind.Function:
      case NamingKind.Method:
      case NamingKind.Variable:
      case NamingKind.Parameter:
      case NamingKind.Property:
        return "camelCase";

      case NamingKind.Constant:
        return "UPPER_SNAKE_CASE";

      default:
        return "camelCase";
    }
  }

  private getSuggestionForKind(kind: NamingKind, currentName: string): string {
    switch (kind) {
      case NamingKind.Class:
      case NamingKind.Interface:
        // Convert to PascalCase
        return `Example: "${this.toPascalCase(currentName)}"`;

      case NamingKind.Function:
      case NamingKind.Method:
      case NamingKind.Variable:
      case NamingKind.Parameter:
      case NamingKind.Property:
        // Convert to camelCase
        return `Example: "${this.toCamelCase(currentName)}"`;

      case NamingKind.Constant:
        // Convert to UPPER_SNAKE_CASE
        return `Example: "${this.toUpperSnakeCase(currentName)}"`;

      default:
        return "";
    }
  }

  private toPascalCase(str: string): string {
    // Simple logic to convert a string to PascalCase
    return str
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");
  }

  private toCamelCase(str: string): string {
    // Simple logic to convert a string to camelCase
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toUpperSnakeCase(str: string): string {
    // Simple logic to convert a string to UPPER_SNAKE_CASE
    return str
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .map((word) => word.toUpperCase())
      .join("_");
  }
}

// Enum for the different kinds of identifiers
enum NamingKind {
  Class,
  Interface,
  Function,
  Method,
  Variable,
  Parameter,
  Property,
  Constant,
}
