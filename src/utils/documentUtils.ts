// src/utils/documentUtils.ts
import * as vscode from "vscode";

/**
 * Gets the text of a specific line in a document
 */
export function getLineText(
  document: vscode.TextDocument,
  lineNumber: number
): string {
  if (lineNumber >= document.lineCount) {
    return "";
  }

  const line = document.lineAt(lineNumber);
  return line.text;
}

/**
 * Gets a range representing a specific line in a document
 */
export function getLineRange(
  document: vscode.TextDocument,
  lineNumber: number
): vscode.Range {
  if (lineNumber >= document.lineCount) {
    return new vscode.Range(0, 0, 0, 0);
  }

  const line = document.lineAt(lineNumber);
  return line.range;
}
