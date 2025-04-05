// src/providers/diagnosticProvider.ts
import * as vscode from "vscode";
import { CodeAnalyzer } from "../analyzers/analyzerInterface";
import { CodeIssue, IssueSeverity } from "../models/codeIssue";

// Collection to store diagnostics
const diagnosticCollection = vscode.languages.createDiagnosticCollection(
  "clean-code-assistant"
);

export function registerDiagnostics(
  context: vscode.ExtensionContext,
  analyzers: CodeAnalyzer[]
): void {
  context.subscriptions.push(diagnosticCollection);

  // Register command to analyze current document
  const analyzeCommand = vscode.commands.registerCommand(
    "clean-code-assistant.analyze",
    async (document: vscode.TextDocument) => {
      await analyzeDocument(document, analyzers);
    }
  );

  context.subscriptions.push(analyzeCommand);
}

async function analyzeDocument(
  document: vscode.TextDocument,
  analyzers: CodeAnalyzer[]
): Promise<void> {
  // Clear previous diagnostics
  diagnosticCollection.set(document.uri, []);

  // Analyze document with all analyzers
  const results = await Promise.all(
    analyzers
      .filter((analyzer) => analyzer.isEnabled())
      .map((analyzer) => analyzer.analyze(document))
  );

  // Collect all issues
  const allIssues: CodeIssue[] = [];
  results.forEach((result) => {
    allIssues.push(...result.issues);
  });

  // Convert issues to diagnostics
  const diagnostics = allIssues.map((issue) => {
    const severity = convertSeverity(issue.severity);
    const diagnostic = new vscode.Diagnostic(
      issue.range,
      issue.message,
      severity
    );
    diagnostic.source = "Clean Code Assistant";
    diagnostic.code = issue.type;

    return diagnostic;
  });

  // Set diagnostics
  diagnosticCollection.set(document.uri, diagnostics);
}

function convertSeverity(severity: IssueSeverity): vscode.DiagnosticSeverity {
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
