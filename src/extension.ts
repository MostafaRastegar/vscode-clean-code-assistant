// src/extension.ts - update with new providers
import * as vscode from "vscode";
import { registerDiagnostics } from "./providers/diagnosticProvider";
import { registerCommands } from "./providers/commandProvider";
import { initializeAnalyzers } from "./analyzers";
import { CleanCodeActionProvider } from "./providers/quickFixProvider";
import { DashboardProvider } from "./providers/dashboardProvider";
import { CleanCodeHoverProvider } from "./providers/hoverProvider";
import { DocumentationViewProvider } from "./providers/documentationViewProvider";
import { IssueType } from "./models/codeIssue";

export function activate(context: vscode.ExtensionContext) {
  console.log("Clean Code Assistant is now active!");

  // Initialize analyzers
  const analyzers = initializeAnalyzers(context);

  // Register diagnostics provider
  registerDiagnostics(context, analyzers);

  // Register hover provider
  const hoverProvider = vscode.languages.registerHoverProvider(
    ["javascript", "typescript"],
    new CleanCodeHoverProvider()
  );

  context.subscriptions.push(hoverProvider);

  // Register documentation view provider
  const documentationProvider = new DocumentationViewProvider(
    context.extensionUri
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DocumentationViewProvider.viewType,
      documentationProvider
    )
  );

  // Register show documentation command
  const showDocumentationCommand = vscode.commands.registerCommand(
    "clean-code-assistant.showDocumentation",
    (args: { issueType: IssueType }) => {
      documentationProvider.showDocumentationForIssueType(args.issueType);
    }
  );

  context.subscriptions.push(showDocumentationCommand);

  // Register commands
  registerCommands(context, analyzers);

  // Register code action provider for quick fixes
  const cleanCodeActionProvider = vscode.languages.registerCodeActionsProvider(
    ["javascript", "typescript"],
    new CleanCodeActionProvider(),
    {
      providedCodeActionKinds: CleanCodeActionProvider.providedCodeActionKinds,
    }
  );

  context.subscriptions.push(cleanCodeActionProvider);

  // Register dashboard provider
  const dashboardProvider = new DashboardProvider(
    context.extensionUri,
    analyzers
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DashboardProvider.viewType,
      dashboardProvider
    )
  );

  // Register refresh dashboard command
  const refreshDashboardCommand = vscode.commands.registerCommand(
    "clean-code-assistant.refreshDashboard",
    () => {
      dashboardProvider.refreshDashboard();
    }
  );

  context.subscriptions.push(refreshDashboardCommand);

  // Subscribe to document events
  const documentChangeSubscription = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const document = event.document;

      // Only analyze JavaScript and TypeScript files
      if (
        document.languageId === "javascript" ||
        document.languageId === "typescript"
      ) {
        vscode.commands.executeCommand(
          "clean-code-assistant.analyze",
          document
        );
      }
    }
  );

  context.subscriptions.push(documentChangeSubscription);

  // Analyze open documents on activation
  vscode.workspace.textDocuments.forEach((document) => {
    if (
      document.languageId === "javascript" ||
      document.languageId === "typescript"
    ) {
      vscode.commands.executeCommand("clean-code-assistant.analyze", document);
    }
  });
}

export function deactivate() {
  console.log("Clean Code Assistant is now deactivated!");
}
