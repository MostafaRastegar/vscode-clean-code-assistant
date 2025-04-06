// src/providers/diagnosticProvider.ts
import * as vscode from "vscode";
import { CodeAnalyzer } from "../analyzers/analyzerInterface";
import { DiagnosticManager } from "../utils/diagnosticManager";
import { AnalysisScheduler } from "../utils/analysisScheduler";

export function registerDiagnostics(
  context: vscode.ExtensionContext,
  analyzers: CodeAnalyzer[]
): void {
  // Get the diagnostic manager instance and register it with the context
  const diagnosticManager = DiagnosticManager.getInstance();
  diagnosticManager.registerDiagnosticCollection(context);

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
  // Get the scheduler instance
  const scheduler = AnalysisScheduler.getInstance();

  // Cancel any in-progress analysis
  scheduler.cancelCurrentAnalysis();

  // Schedule a new progressive analysis
  await scheduler.scheduleAnalysis(document, analyzers);
}
