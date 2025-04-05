// src/providers/dashboardProvider.ts
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { CodeAnalyzer } from "../analyzers/analyzerInterface";
import { CodeIssue, IssueSeverity, IssueType } from "../models/codeIssue";

/**
 * Provider for code quality dashboard
 */
export class DashboardProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "clean-code-assistant.dashboard";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _analyzers: CodeAnalyzer[];

  constructor(extensionUri: vscode.Uri, analyzers: CodeAnalyzer[]) {
    this._extensionUri = extensionUri;
    this._analyzers = analyzers;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    // Set options for the webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // Set initial HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "init":
        case "refresh":
          await this.refreshDashboard();
          break;

        case "navigate":
          await this.navigateToIssue(
            message.file,
            message.line,
            message.column
          );
          break;
      }
    });
  }

  /**
   * Refreshes the dashboard with latest data
   */
  public async refreshDashboard() {
    if (!this._view) {
      return;
    }

    try {
      // Collect all diagnostics
      const allDiagnostics = this.collectDiagnostics();

      // Convert to simpler format for webview
      const issues = allDiagnostics.map((item) => {
        return {
          type: item.diagnostic.code as IssueType,
          message: item.diagnostic.message,
          severity: item.diagnostic.severity,
          file: vscode.workspace.asRelativePath(item.uri),
          line: item.diagnostic.range.start.line,
          column: item.diagnostic.range.start.character,
        };
      });

      // Send data to webview
      this._view.webview.postMessage({
        type: "update",
        issues: issues,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to refresh dashboard: ${error}`);
      console.error(error);
    }
  }

  /**
   * Navigates to a specific issue in the editor
   */
  private async navigateToIssue(file: string, line: number, column: number) {
    try {
      // Get absolute file path
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        return;
      }

      // Try to find the file in any workspace folder
      let fileUri: vscode.Uri | undefined;

      for (const folder of workspaceFolders) {
        const potentialUri = vscode.Uri.joinPath(folder.uri, file);
        try {
          await vscode.workspace.fs.stat(potentialUri);
          fileUri = potentialUri;
          break;
        } catch {
          // File doesn't exist in this folder, try next one
        }
      }

      if (!fileUri) {
        vscode.window.showErrorMessage(`File not found: ${file}`);
        return;
      }

      // Open the document
      const document = await vscode.workspace.openTextDocument(fileUri);

      // Show the document in the editor
      await vscode.window.showTextDocument(document, {
        selection: new vscode.Range(line, column, line, column),
        viewColumn: vscode.ViewColumn.One,
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to navigate to issue: ${error}`);
      console.error(error);
    }
  }

  /**
   * Collects all diagnostics from the diagnostic collection
   */
  private collectDiagnostics(): Array<{
    uri: vscode.Uri;
    diagnostic: vscode.Diagnostic;
  }> {
    const result: Array<{ uri: vscode.Uri; diagnostic: vscode.Diagnostic }> =
      [];

    const diagnosticCollection = vscode.languages.getDiagnostics();

    for (const [uri, diagnostics] of diagnosticCollection) {
      for (const diagnostic of diagnostics) {
        if (diagnostic.source === "Clean Code Assistant") {
          result.push({ uri, diagnostic });
        }
      }
    }

    return result;
  }

  /**
   * Generates HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Read the HTML file
    const htmlPath = path.join(
      this._extensionUri.fsPath,
      "src",
      "webview",
      "dashboard.html"
    );
    let html = fs.readFileSync(htmlPath, "utf8");

    return html;
  }
}
