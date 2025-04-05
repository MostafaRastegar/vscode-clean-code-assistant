// src/utils/astUtils.ts
import * as ts from "typescript";

/**
 * Extracts information about a function node
 */
export function getFunctionInfo(
  node: ts.Node,
  sourceFile: ts.SourceFile
): { name: string } | null {
  // For function declarations, get name directly
  if (ts.isFunctionDeclaration(node)) {
    return {
      name: node.name ? node.name.getText(sourceFile) : "anonymous function",
    };
  }

  // For method declarations, get name directly
  if (ts.isMethodDeclaration(node)) {
    return {
      name: node.name.getText(sourceFile),
    };
  }

  // For function expressions, try to get the variable name if assigned
  if (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    // Check if parent is a variable declaration
    if (node.parent && ts.isVariableDeclaration(node.parent)) {
      return {
        name: node.parent.name.getText(sourceFile),
      };
    }

    // Check if parent is a property assignment
    if (node.parent && ts.isPropertyAssignment(node.parent)) {
      return {
        name: node.parent.name.getText(sourceFile),
      };
    }

    return {
      name: "anonymous function",
    };
  }

  return null;
}
