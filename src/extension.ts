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
import { debounce } from "./utils/debounce";
import { StatusBarManager } from "./utils/statusBarManager";

// Configuration for analysis debounce timeout
const ANALYSIS_DEBOUNCE_MS = 500; // Delay analysis by 500ms after typing stops

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

  // Initialize and register status bar
  const statusBarManager = StatusBarManager.getInstance();
  statusBarManager.register(context);

  // Register command to analyze current document manually
  const analyzeCurrentDocumentCommand = vscode.commands.registerCommand(
    "clean-code-assistant.analyzeCurrentDocument",
    () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const document = activeEditor.document;
        if (
          document.languageId === "javascript" ||
          document.languageId === "typescript"
        ) {
          statusBarManager.setAnalyzing();
          vscode.commands
            .executeCommand("clean-code-assistant.analyze", document)
            .then(() => {
              statusBarManager.setCompleted();
            });
        } else {
          vscode.window.showInformationMessage(
            "Clean Code Assistant only works with JavaScript and TypeScript files."
          );
        }
      }
    }
  );

  context.subscriptions.push(analyzeCurrentDocumentCommand);

  // Create a debounced version of the analysis command
  const debouncedAnalyze = debounce((document: vscode.TextDocument) => {
    statusBarManager.setAnalyzing();
    vscode.commands
      .executeCommand("clean-code-assistant.analyze", document)
      .then(() => {
        statusBarManager.setCompleted();
      });
  }, ANALYSIS_DEBOUNCE_MS);

  // Subscribe to document save events
  const documentSaveSubscription = vscode.workspace.onDidSaveTextDocument(
    (document) => {
      // Check if analysis mode is set to onSave or onChange
      const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
      const analysisMode = config.get<string>("analysisMode", "onChange");

      if (analysisMode === "onSave" || analysisMode === "onChange") {
        if (
          document.languageId === "javascript" ||
          document.languageId === "typescript"
        ) {
          statusBarManager.setAnalyzing();
          vscode.commands
            .executeCommand("clean-code-assistant.analyze", document)
            .then(() => {
              statusBarManager.setCompleted();
            });
        }
      }
    }
  );

  context.subscriptions.push(documentSaveSubscription);

  // Subscribe to document changes
  const documentChangeSubscription = vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const document = event.document;

      // Check if analysis mode is set to onChange
      const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
      const analysisMode = config.get<string>("analysisMode", "onChange");

      if (analysisMode === "onChange") {
        // Only analyze JavaScript and TypeScript files
        if (
          document.languageId === "javascript" ||
          document.languageId === "typescript"
        ) {
          // Use debounced analysis to avoid analyzing while typing
          statusBarManager.setAnalyzing();
          debouncedAnalyze(document);
        }
      }
    }
  );

  context.subscriptions.push(documentChangeSubscription);

  // Listen for configuration changes
  const configChangeSubscription = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration("cleanCodeAssistant")) {
        statusBarManager.onSettingsChanged();
      }
    }
  );

  context.subscriptions.push(configChangeSubscription);

  // Analyze open documents on activation based on settings
  const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
  const analyzeOnActivation = config.get<boolean>("analyzeOnActivation", true);

  if (analyzeOnActivation) {
    vscode.workspace.textDocuments.forEach((document) => {
      if (
        document.languageId === "javascript" ||
        document.languageId === "typescript"
      ) {
        statusBarManager.setAnalyzing();
        vscode.commands
          .executeCommand("clean-code-assistant.analyze", document)
          .then(() => {
            statusBarManager.setCompleted();
          });
      }
    });
  }
}

export function deactivate() {
  console.log("Clean Code Assistant is now deactivated!");
}
