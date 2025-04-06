// src/utils/diagnosticManager.ts
import * as vscode from "vscode";
import { CodeIssue, IssueSeverity } from "../models/codeIssue";

/**
 * Manages diagnostic updates to minimize UI flickering
 */
export class DiagnosticManager {
  private static instance: DiagnosticManager;
  private diagnosticCollection: vscode.DiagnosticCollection;
  private pendingUpdates = new Map<string, vscode.Diagnostic[]>();
  private updateTimer: NodeJS.Timeout | null = null;
  private batchInterval = 250; // ms to batch updates

  private constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection(
      "clean-code-assistant"
    );
  }

  /**
   * Gets the singleton instance of DiagnosticManager
   */
  public static getInstance(): DiagnosticManager {
    if (!DiagnosticManager.instance) {
      DiagnosticManager.instance = new DiagnosticManager();
    }
    return DiagnosticManager.instance;
  }

  /**
   * Adds the diagnostic collection to the extension's disposables
   */
  public registerDiagnosticCollection(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.diagnosticCollection);
  }

  /**
   * Updates diagnostics for a document in a way that minimizes UI flickering
   * @param document The document to update diagnostics for
   * @param issues The code issues to convert to diagnostics
   */
  public updateDiagnostics(
    document: vscode.TextDocument,
    issues: CodeIssue[]
  ): void {
    // Convert issues to diagnostics
    const newDiagnostics = issues.map((issue) => {
      const severity = this.convertSeverity(issue.severity);
      const diagnostic = new vscode.Diagnostic(
        issue.range,
        issue.message,
        severity
      );
      diagnostic.source = "Clean Code Assistant";
      diagnostic.code = issue.type;

      return diagnostic;
    });

    const uriString = document.uri.toString();

    // Store pending update for this document
    this.pendingUpdates.set(uriString, newDiagnostics);

    // Schedule a batch update if one is not already scheduled
    if (this.updateTimer === null) {
      this.updateTimer = setTimeout(() => {
        this.applyBatchUpdate();
      }, this.batchInterval);
    }
  }

  /**
   * Clear diagnostics for a specific document
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
    this.pendingUpdates.delete(document.uri.toString());
  }

  /**
   * Clear all diagnostics
   */
  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.pendingUpdates.clear();
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Apply all pending diagnostic updates in a batch
   */
  private applyBatchUpdate(): void {
    // Apply all pending updates
    this.pendingUpdates.forEach((diagnostics, uriString) => {
      const uri = vscode.Uri.parse(uriString);

      // Get existing diagnostics
      const existingDiagnostics = this.diagnosticCollection.get(uri) || [];

      // If they're the same, no need to update
      if (this.areDiagnosticsEqual(existingDiagnostics, diagnostics)) {
        return;
      }

      // Apply the update
      this.diagnosticCollection.set(uri, diagnostics);
    });

    // Clear pending updates and timer
    this.pendingUpdates.clear();
    this.updateTimer = null;
  }

  /**
   * Check if two diagnostic arrays are equal (to avoid unnecessary updates)
   */
  private areDiagnosticsEqual(
    a: readonly vscode.Diagnostic[],
    b: vscode.Diagnostic[]
  ): boolean {
    if (a.length !== b.length) {
      return false;
    }

    // Compare each diagnostic (simplified comparison)
    for (let i = 0; i < a.length; i++) {
      const diagA = a[i];
      const diagB = b[i];

      if (
        diagA.message !== diagB.message ||
        diagA.severity !== diagB.severity ||
        diagA.code !== diagB.code ||
        !diagA.range.isEqual(diagB.range)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Convert issue severity to diagnostic severity
   */
  private convertSeverity(severity: IssueSeverity): vscode.DiagnosticSeverity {
    switch (severity) {
      case IssueSeverity.Error:
        return vscode.DiagnosticSeverity.Error;
      case IssueSeverity.Warning:
        return vscode.DiagnosticSeverity.Warning;
      case IssueSeverity.Information:
        return vscode.DiagnosticSeverity.Information;
      case IssueSeverity.Hint:
        return vscode.DiagnosticSeverity.Hint;
      default:
        return vscode.DiagnosticSeverity.Warning;
    }
  }
}
