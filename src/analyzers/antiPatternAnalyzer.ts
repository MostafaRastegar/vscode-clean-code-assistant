// src/analyzers/antiPatternAnalyzer.ts
import * as vscode from "vscode";
import * as ts from "typescript";
import { CodeAnalyzer } from "./analyzerInterface";
import {
  AnalyzerResult,
  CodeIssue,
  IssueSeverity,
  IssueType,
} from "../models/codeIssue";

export class AntiPatternAnalyzer implements CodeAnalyzer {
  id = "anti-pattern";
  name = "Anti-Pattern Analyzer";
  description = "Analyzes code for common anti-patterns and code smells";

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

    // Check for different anti-patterns
    this.checkGodObject(sourceFile, document, issues, config);
    this.checkFeatureEnvy(sourceFile, document, issues, config);
    this.checkLongParameterList(sourceFile, document, issues, config);
    this.checkPrimitiveObsession(sourceFile, document, issues, config);
    this.checkShotgunSurgery(sourceFile, document, issues, config);
    this.checkDataClump(sourceFile, document, issues, config);

    return { issues };
  }

  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    return config.get<boolean>("enableAntiPatternAnalyzer", true);
  }

  /**
   * Checks for God Object anti-pattern (large classes with too many properties/methods)
   */
  private checkGodObject(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[],
    config: vscode.WorkspaceConfiguration
  ): void {
    const maxClassSize = config.get<number>("maxClassSize", 200);
    const maxProperties = config.get<number>("maxClassProperties", 15);

    function visit(node: ts.Node) {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;

        // Count properties and methods
        const properties = node.members.filter(
          (member) =>
            ts.isPropertyDeclaration(member) ||
            ts.isGetAccessor(member) ||
            ts.isSetAccessor(member)
        );

        const methods = node.members.filter((member) =>
          ts.isMethodDeclaration(member)
        );

        // Calculate class size (approximation by lines)
        const startLine = document.positionAt(node.getStart(sourceFile)).line;
        const endLine = document.positionAt(node.getEnd()).line;
        const linesOfCode = endLine - startLine + 1;

        // Check if class is too large
        if (linesOfCode > maxClassSize) {
          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(node.name.getEnd());

          const issue: CodeIssue = {
            type: IssueType.AntiPattern,
            message: `God Object: Class "${className}" has ${linesOfCode} lines, which is a sign it may have too many responsibilities.`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Warning,
            suggestions: [
              "Break down the class into smaller, more focused classes",
              "Apply the Single Responsibility Principle",
              "Consider using composition over inheritance",
              "Extract related methods into separate service classes",
            ],
          };

          issues.push(issue);
        }

        // Check if class has too many properties
        if (properties.length > maxProperties) {
          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(node.name.getEnd());

          const issue: CodeIssue = {
            type: IssueType.AntiPattern,
            message: `God Object: Class "${className}" has ${properties.length} properties, which is a sign of potential data clump or god object.`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Warning,
            suggestions: [
              "Group related properties into new classes",
              "Consider if some properties can be moved to other classes",
              "Use composition to break down the class structure",
            ],
          };

          issues.push(issue);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  /**
   * Checks for Feature Envy anti-pattern (methods that use more external data than their own)
   */
  private checkFeatureEnvy(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[],
    config: vscode.WorkspaceConfiguration
  ): void {
    const featureEnvyThreshold = config.get<number>("featureEnvyThreshold", 3);

    // Map to keep track of class properties
    const classProperties = new Map<string, Set<string>>();

    // First pass: collect property names for each class
    function collectClassProperties(node: ts.Node) {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const propertySet = new Set<string>();

        // Collect property names
        node.members.forEach((member) => {
          if (ts.isPropertyDeclaration(member) && member.name) {
            if (ts.isIdentifier(member.name)) {
              propertySet.add(member.name.text);
            }
          }
        });

        classProperties.set(className, propertySet);
      }

      ts.forEachChild(node, collectClassProperties);
    }

    collectClassProperties(sourceFile);

    // Second pass: check for feature envy
    function visit(node: ts.Node) {
      if (
        ts.isMethodDeclaration(node) &&
        node.parent &&
        ts.isClassDeclaration(node.parent) &&
        node.parent.name &&
        node.name
      ) {
        const className = node.parent.name.text;
        const methodName = ts.isIdentifier(node.name)
          ? node.name.text
          : "unknown";

        // Skip if we don't have property info for this class
        if (!classProperties.has(className)) {
          return;
        }

        const classProps = classProperties.get(className)!;

        // Track property access
        const accessedProps = new Map<string, number>();
        let ownPropsAccessed = 0;
        let otherPropsAccessed = 0;

        // Find property access expressions in the method
        function findPropertyAccess(node: ts.Node) {
          if (ts.isPropertyAccessExpression(node)) {
            // Check if accessing property on this
            const propName = node.name.text;

            if (node.expression.kind === ts.SyntaxKind.ThisKeyword) {
              // Accessing own property
              ownPropsAccessed++;
            } else {
              // Accessing external property
              otherPropsAccessed++;

              // Track the object being accessed
              let objName = "";
              if (ts.isIdentifier(node.expression)) {
                objName = node.expression.text;
              }

              if (objName) {
                accessedProps.set(
                  objName,
                  (accessedProps.get(objName) || 0) + 1
                );
              }
            }
          }

          ts.forEachChild(node, findPropertyAccess);
        }

        if (node.body) {
          findPropertyAccess(node.body);
        }

        // Check if method accesses external properties more than own properties
        for (const [objName, count] of accessedProps.entries()) {
          if (count > featureEnvyThreshold && count > ownPropsAccessed) {
            const start = document.positionAt(node.getStart(sourceFile));
            const end = document.positionAt(node.name.getEnd());

            const issue: CodeIssue = {
              type: IssueType.AntiPattern,
              message: `Feature Envy: Method "${methodName}" accesses properties of "${objName}" ${count} times, but only uses its own class properties ${ownPropsAccessed} times.`,
              range: new vscode.Range(start, end),
              severity: IssueSeverity.Information,
              suggestions: [
                `Consider moving this method to class "${objName}"`,
                "Extract a new class that groups the related functionality",
                "Use delegation instead of direct property access",
              ],
            };

            issues.push(issue);
            break; // Only report once per method
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  /**
   * Checks for Long Parameter List anti-pattern
   */
  private checkLongParameterList(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[],
    config: vscode.WorkspaceConfiguration
  ): void {
    const maxParameters = config.get<number>("maxParameterCount", 4);

    function visit(node: ts.Node) {
      if (
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        node.parameters.length > maxParameters
      ) {
        let functionName = "anonymous function";

        if (node.name && ts.isIdentifier(node.name)) {
          functionName = node.name.text;
        }

        const start = document.positionAt(node.getStart(sourceFile));
        const end = document.positionAt(
          node.name ? node.name.getEnd() : node.getStart(sourceFile) + 8
        );

        const issue: CodeIssue = {
          type: IssueType.AntiPattern,
          message: `Long Parameter List: Function "${functionName}" has ${node.parameters.length} parameters, which exceeds the recommended maximum of ${maxParameters}.`,
          range: new vscode.Range(start, end),
          severity: IssueSeverity.Information,
          suggestions: [
            "Group related parameters into objects",
            "Create a Parameter Object class",
            "Consider if some parameters can be set via class properties instead",
            "Use the Builder pattern for complex object creation",
          ],
        };

        issues.push(issue);
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  /**
   * Checks for Primitive Obsession anti-pattern
   */
  private checkPrimitiveObsession(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[],
    config: vscode.WorkspaceConfiguration
  ): void {
    // Detect common primitive types that often represent domain concepts
    const primitivePatterns = [
      { pattern: /email/i, suggestion: "Email" },
      { pattern: /phone/i, suggestion: "PhoneNumber" },
      { pattern: /address/i, suggestion: "Address" },
      { pattern: /money|price|amount|cost/i, suggestion: "Money" },
      { pattern: /date|time/i, suggestion: "DateTime" },
      { pattern: /name/i, suggestion: "PersonName" },
      { pattern: /currency/i, suggestion: "Currency" },
      { pattern: /percent|percentage/i, suggestion: "Percentage" },
      { pattern: /url|uri/i, suggestion: "URL" },
      { pattern: /coordinate|location|position/i, suggestion: "Coordinate" },
    ];

    function visit(node: ts.Node) {
      // Check variable declarations
      if (
        ts.isVariableDeclaration(node) &&
        node.name &&
        ts.isIdentifier(node.name)
      ) {
        const variableName = node.name.text;

        // Check if type is a primitive
        let isPrimitive = false;
        let typeStr = "unknown";

        if (node.type) {
          if (
            ts.isTypeReferenceNode(node.type) &&
            ts.isIdentifier(node.type.typeName)
          ) {
            typeStr = node.type.typeName.text;

            // Check if primitive type
            isPrimitive = ["string", "number", "boolean"].includes(
              typeStr.toLowerCase()
            );
          }
        }

        // If it's a primitive, check variable name against patterns
        if (isPrimitive || !node.type) {
          for (const { pattern, suggestion } of primitivePatterns) {
            if (pattern.test(variableName)) {
              const start = document.positionAt(node.getStart(sourceFile));
              const end = document.positionAt(node.name.getEnd());

              const issue: CodeIssue = {
                type: IssueType.AntiPattern,
                message: `Primitive Obsession: Variable "${variableName}" appears to represent a domain concept but uses a primitive type.`,
                range: new vscode.Range(start, end),
                severity: IssueSeverity.Information,
                suggestions: [
                  `Consider creating a "${suggestion}" class to encapsulate this concept`,
                  "Use value objects to represent domain concepts",
                  "Domain primitives enhance type safety and business logic encapsulation",
                ],
              };

              issues.push(issue);
              break;
            }
          }
        }
      }

      // Check function parameters too
      if (
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        node.parameters
      ) {
        node.parameters.forEach((param) => {
          if (param.name && ts.isIdentifier(param.name)) {
            const paramName = param.name.text;

            // Check parameter type
            let isPrimitive = false;
            if (param.type) {
              if (
                ts.isTypeReferenceNode(param.type) &&
                ts.isIdentifier(param.type.typeName)
              ) {
                const typeStr = param.type.typeName.text;
                isPrimitive = ["string", "number", "boolean"].includes(
                  typeStr.toLowerCase()
                );
              } else if (
                // Fix: Use syntax kind check instead of isKeywordTypeNode
                param.type.kind >= ts.SyntaxKind.StringKeyword &&
                param.type.kind <= ts.SyntaxKind.UndefinedKeyword
              ) {
                isPrimitive = true;
              }
            } else {
              isPrimitive = true; // Assume primitive if no type specified
            }

            if (isPrimitive) {
              for (const { pattern, suggestion } of primitivePatterns) {
                if (pattern.test(paramName)) {
                  const start = document.positionAt(param.getStart(sourceFile));
                  const end = document.positionAt(param.name.getEnd());

                  const issue: CodeIssue = {
                    type: IssueType.AntiPattern,
                    message: `Primitive Obsession: Parameter "${paramName}" appears to represent a domain concept but uses a primitive type.`,
                    range: new vscode.Range(start, end),
                    severity: IssueSeverity.Information,
                    suggestions: [
                      `Consider creating a "${suggestion}" class to encapsulate this concept`,
                      "Use value objects to represent domain concepts",
                      "Domain primitives enhance type safety and business logic encapsulation",
                    ],
                  };

                  issues.push(issue);
                  break;
                }
              }
            }
          }
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  /**
   * Checks for Shotgun Surgery anti-pattern (code that requires changes in many places)
   */
  private checkShotgunSurgery(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[],
    config: vscode.WorkspaceConfiguration
  ): void {
    // This is a simplified version - in a real extension, this would require
    // cross-file analysis and codebase-wide understanding

    // For now, we'll look for string literals that are repeated across multiple functions
    // as a simple indicator of potential shotgun surgery

    const minOccurrences = config.get<number>("minStringLiteralOccurrences", 3);
    const stringLiterals = new Map<
      string,
      { count: number; locations: ts.Node[] }
    >();

    function visit(node: ts.Node) {
      // Track string literals
      if (ts.isStringLiteral(node) && node.text.length > 5) {
        const text = node.text;

        if (!stringLiterals.has(text)) {
          stringLiterals.set(text, { count: 0, locations: [] });
        }

        const entry = stringLiterals.get(text)!;
        entry.count++;
        entry.locations.push(node);
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Check for string literals that appear multiple times
    for (const [text, { count, locations }] of stringLiterals.entries()) {
      if (count >= minOccurrences) {
        // Find functions containing these occurrences
        const functionContainmentMap = new Map<string, number>();

        for (const location of locations) {
          // Find enclosing function
          let parent: ts.Node = location;
          while (
            parent &&
            !ts.isFunctionDeclaration(parent) &&
            !ts.isMethodDeclaration(parent) &&
            !ts.isFunctionExpression(parent) &&
            !ts.isArrowFunction(parent)
          ) {
            parent = parent.parent;
          }

          if (parent) {
            let functionName = "anonymous function";

            if (
              (ts.isFunctionDeclaration(parent) ||
                ts.isMethodDeclaration(parent)) &&
              parent.name &&
              ts.isIdentifier(parent.name)
            ) {
              functionName = parent.name.text;
            }

            functionContainmentMap.set(
              functionName,
              (functionContainmentMap.get(functionName) || 0) + 1
            );
          }
        }

        // If string literal appears in multiple functions, it's a potential shotgun surgery issue
        if (functionContainmentMap.size >= 2) {
          // Report issue on one of the occurrences
          const node = locations[0];
          const start = document.positionAt(node.getStart(sourceFile));
          const end = document.positionAt(node.getEnd());

          const functionList = Array.from(functionContainmentMap.keys()).join(
            ", "
          );

          const issue: CodeIssue = {
            type: IssueType.AntiPattern,
            message: `Shotgun Surgery: String literal "${
              text.length > 20 ? text.substring(0, 20) + "..." : text
            }" appears ${count} times in ${
              functionContainmentMap.size
            } different functions (${functionList}).`,
            range: new vscode.Range(start, end),
            severity: IssueSeverity.Information,
            suggestions: [
              "Extract the string into a named constant",
              "Consider if this represents a concept that should be modeled as a class",
              "Use an enum if the string represents one of several options",
              "Create a configuration class or settings file for these values",
            ],
          };

          issues.push(issue);
        }
      }
    }
  }

  /**
   * Checks for Data Clump anti-pattern (groups of variables that appear together)
   */
  private checkDataClump(
    sourceFile: ts.SourceFile,
    document: vscode.TextDocument,
    issues: CodeIssue[],
    config: vscode.WorkspaceConfiguration
  ): void {
    const minClumpSize = config.get<number>("minDataClumpSize", 3);

    // Find parameter groups that appear together in multiple methods
    const parameterGroups = new Map<
      string,
      { count: number; methods: string[]; node: ts.Node }
    >();

    function visit(node: ts.Node) {
      if (
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        node.parameters.length >= minClumpSize
      ) {
        let methodName = "anonymous function";

        if (node.name && ts.isIdentifier(node.name)) {
          methodName = node.name.text;
        }

        // Get parameter names
        const paramNames = node.parameters
          .filter((p) => p.name && ts.isIdentifier(p.name))
          .map((p) => (p.name as ts.Identifier).text)
          .sort();

        // Create groups of N consecutive parameters
        for (let i = 0; i <= paramNames.length - minClumpSize; i++) {
          const group = paramNames.slice(i, i + minClumpSize);
          const groupKey = group.join(",");

          if (!parameterGroups.has(groupKey)) {
            parameterGroups.set(groupKey, { count: 0, methods: [], node });
          }

          const entry = parameterGroups.get(groupKey)!;
          entry.count++;
          entry.methods.push(methodName);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Report data clumps that appear in multiple methods
    for (const [
      groupKey,
      { count, methods, node },
    ] of parameterGroups.entries()) {
      if (count >= 2 && new Set(methods).size >= 2) {
        const start = document.positionAt(node.getStart(sourceFile));
        const end = document.positionAt(node.getEnd());

        const paramList = groupKey.split(",").join(", ");

        const issue: CodeIssue = {
          type: IssueType.AntiPattern,
          message: `Data Clump: Parameters (${paramList}) appear together in multiple methods: ${methods.join(
            ", "
          )}.`,
          range: new vscode.Range(start, end),
          severity: IssueSeverity.Information,
          suggestions: [
            "Create a class to encapsulate these parameters",
            "Use a Parameter Object pattern",
            "This group of data might represent a concept in your domain model",
          ],
        };

        issues.push(issue);
      }
    }
  }
}
