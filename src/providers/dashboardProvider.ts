// src/providers/dashboardProvider.ts - Updated Version
import * as vscode from "vscode";
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

    // Get all diagnostics from all files
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
   * Generates HTML for the webview - now inline instead of loading from file
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Return the dashboard HTML directly instead of reading from file
    return `<!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Clean Code Dashboard</title>
      <style>
        :root {
          --background-color: var(--vscode-editor-background);
          --foreground-color: var(--vscode-editor-foreground);
          --border-color: var(--vscode-panel-border);
          --link-color: var(--vscode-textLink-foreground);
          --warning-color: var(--vscode-editorWarning-foreground);
          --error-color: var(--vscode-editorError-foreground);
          --info-color: var(--vscode-editorInfo-foreground);
          --chart-color-1: #4e79a7;
          --chart-color-2: #f28e2c;
          --chart-color-3: #e15759;
          --chart-color-4: #76b7b2;
          --chart-color-5: #59a14f;
        }
    
        body {
          background-color: var(--background-color);
          color: var(--foreground-color);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.5;
          margin: 0;
          padding: 20px;
        }
    
        h1,
        h2,
        h3 {
          font-weight: normal;
          margin-top: 0;
        }
    
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          grid-gap: 20px;
          margin-bottom: 20px;
        }
    
        .card {
          background-color: var(--background-color);
          border: 1px solid var(--border-color);
          border-radius: 5px;
          padding: 15px;
        }
    
        .metric {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
    
        .metric-value {
          font-size: 2em;
          font-weight: bold;
          margin-right: 10px;
        }
    
        .metric-label {
          font-size: 0.9em;
          opacity: 0.8;
        }
    
        .chart {
          width: 100%;
          height: 200px;
          margin-top: 10px;
        }
    
        .issues-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
          max-height: 300px;
          overflow-y: auto;
        }
    
        .issue-item {
          padding: 10px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
        }
    
        .issue-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
    
        .issue-type {
          font-size: 0.8em;
          padding: 2px 6px;
          border-radius: 3px;
          margin-right: 5px;
        }
    
        .issue-type-complexity {
          background-color: var(--chart-color-1);
        }
    
        .issue-type-naming {
          background-color: var(--chart-color-2);
        }
    
        .issue-type-duplicate-code {
          background-color: var(--chart-color-3);
        }
    
        .issue-type-solid-violation {
          background-color: var(--chart-color-4);
        }
    
        .severity-error {
          border-left: 3px solid var(--error-color);
        }
    
        .severity-warning {
          border-left: 3px solid var(--warning-color);
        }
    
        .severity-info {
          border-left: 3px solid var(--info-color);
        }
    
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
        }
    
        .filter-button {
          background-color: transparent;
          border: 1px solid var(--border-color);
          border-radius: 3px;
          padding: 5px 10px;
          color: var(--foreground-color);
          cursor: pointer;
        }
    
        .filter-button.active {
          background-color: var(--link-color);
          border-color: var(--link-color);
        }
    
        .progress-container {
          margin-bottom: 10px;
        }
    
        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
    
        .progress-bar {
          height: 8px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
    
        .progress-value {
          height: 100%;
          border-radius: 4px;
        }
    
        #refresh-button {
          background-color: var(--link-color);
          border: none;
          border-radius: 3px;
          color: white;
          padding: 8px 16px;
          cursor: pointer;
          margin-bottom: 20px;
        }
      </style>
    </head>
    
    <body>
      <h1>Clean Code Dashboard</h1>
    
      <button id="refresh-button">Refresh Analysis</button>
    
      <div class="filters">
        <button class="filter-button active" data-filter="all">All Issues</button>
        <button class="filter-button" data-filter="complexity">Complexity</button>
        <button class="filter-button" data-filter="naming">Naming</button>
        <button class="filter-button" data-filter="duplicate-code">Duplicate Code</button>
        <button class="filter-button" data-filter="solid-violation">SOLID Violations</button>
      </div>
    
      <div class="container">
        <div class="card">
          <h2>Issues Summary</h2>
          <div class="metric">
            <div class="metric-value" id="total-issues">0</div>
            <div class="metric-label">Total Issues</div>
          </div>
          <canvas id="issues-chart" class="chart"></canvas>
        </div>
    
        <div class="card">
          <h2>Code Quality Score</h2>
          <div class="metric">
            <div class="metric-value" id="quality-score">0</div>
            <div class="metric-label">/ 100</div>
          </div>
          <div class="progress-container">
            <div class="progress-label">
              <span>Complexity</span>
              <span id="complexity-score">0%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-value" id="complexity-progress"
                style="width: 0%; background-color: var(--chart-color-1);"></div>
            </div>
          </div>
          <div class="progress-container">
            <div class="progress-label">
              <span>Naming</span>
              <span id="naming-score">0%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-value" id="naming-progress" style="width: 0%; background-color: var(--chart-color-2);">
              </div>
            </div>
          </div>
          <div class="progress-container">
            <div class="progress-label">
              <span>Duplication</span>
              <span id="duplication-score">0%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-value" id="duplication-progress"
                style="width: 0%; background-color: var(--chart-color-3);"></div>
            </div>
          </div>
          <div class="progress-container">
            <div class="progress-label">
              <span>SOLID Principles</span>
              <span id="solid-score">0%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-value" id="solid-progress" style="width: 0%; background-color: var(--chart-color-4);">
              </div>
            </div>
          </div>
        </div>
      </div>
    
      <div class="card">
        <h2>Issues List</h2>
        <ul class="issues-list" id="issues-list">
          <!-- Issues will be populated here dynamically -->
        </ul>
      </div>
    
      <script>
        (function () {
          // VS Code API for communication with extension
          const vscode = acquireVsCodeApi();
    
          // Store state
          let state = {
            issues: [],
            filter: 'all'
          };
    
          // Get elements
          const refreshButton = document.getElementById('refresh-button');
          const totalIssuesElement = document.getElementById('total-issues');
          const qualityScoreElement = document.getElementById('quality-score');
          const issuesListElement = document.getElementById('issues-list');
          const filterButtons = document.querySelectorAll('.filter-button');
    
          // Progress elements
          const complexityScoreElement = document.getElementById('complexity-score');
          const complexityProgressElement = document.getElementById('complexity-progress');
          const namingScoreElement = document.getElementById('naming-score');
          const namingProgressElement = document.getElementById('naming-progress');
          const duplicationScoreElement = document.getElementById('duplication-score');
          const duplicationProgressElement = document.getElementById('duplication-progress');
          const solidScoreElement = document.getElementById('solid-score');
          const solidProgressElement = document.getElementById('solid-progress');
    
          // Initialize charts
          let issuesChart = null;
    
          // Handle refresh button click
          refreshButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'refresh' });
          });
    
          // Handle filter buttons
          filterButtons.forEach(button => {
            button.addEventListener('click', () => {
              // Update active button
              filterButtons.forEach(btn => btn.classList.remove('active'));
              button.classList.add('active');
    
              // Update filter
              state.filter = button.dataset.filter;
    
              // Update display
              renderIssuesList();
            });
          });
    
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
    
            switch (message.type) {
              case 'update':
                // Update state with new data
                state.issues = message.issues;
    
                // Update UI
                updateSummary();
                renderIssuesList();
                updateCharts();
                break;
            }
          });
    
          // Update summary metrics
          function updateSummary() {
            // Count issues
            const totalIssues = state.issues.length;
            totalIssuesElement.textContent = totalIssues;
    
            // Calculate scores
            const complexityIssues = state.issues.filter(issue => issue.type === 'complexity').length;
            const namingIssues = state.issues.filter(issue => issue.type === 'naming').length;
            const duplicationIssues = state.issues.filter(issue => issue.type === 'duplicate-code').length;
            const solidIssues = state.issues.filter(issue => issue.type === 'solid-violation').length;
    
            // Base score calculation (this is simplified)
            const baseScore = 100;
            const complexityPenalty = Math.min(25, complexityIssues * 2);
            const namingPenalty = Math.min(25, namingIssues);
            const duplicationPenalty = Math.min(25, duplicationIssues * 3);
            const solidPenalty = Math.min(25, solidIssues * 4);
    
            const qualityScore = Math.max(0, baseScore - complexityPenalty - namingPenalty - duplicationPenalty - solidPenalty);
            qualityScoreElement.textContent = qualityScore;
    
            // Calculate individual scores
            const complexityScore = Math.max(0, 100 - (complexityIssues * 8));
            const namingScore = Math.max(0, 100 - (namingIssues * 4));
            const duplicationScore = Math.max(0, 100 - (duplicationIssues * 12));
            const solidScore = Math.max(0, 100 - (solidIssues * 16));
    
            // Update progress bars
            complexityScoreElement.textContent = \`\${complexityScore}%\`;
            complexityProgressElement.style.width = \`\${complexityScore}%\`;
    
            namingScoreElement.textContent = \`\${namingScore}%\`;
            namingProgressElement.style.width = \`\${namingScore}%\`;
    
            duplicationScoreElement.textContent = \`\${duplicationScore}%\`;
            duplicationProgressElement.style.width = \`\${duplicationScore}%\`;
    
            solidScoreElement.textContent = \`\${solidScore}%\`;
            solidProgressElement.style.width = \`\${solidScore}%\`;
          }
    
          // Render issues list based on current filter
          function renderIssuesList() {
            // Clear list
            issuesListElement.innerHTML = '';
    
            // Filter issues
            const filteredIssues = state.filter === 'all'
              ? state.issues
              : state.issues.filter(issue => issue.type === state.filter);
    
            // Create list items
            filteredIssues.forEach(issue => {
              const li = document.createElement('li');
              li.className = \`issue-item severity-\${getSeverityClass(issue.severity)}\`;
    
              // Add issue type badge
              const typeBadge = document.createElement('span');
              typeBadge.className = \`issue-type issue-type-\${issue.type}\`;
              typeBadge.textContent = getTypeName(issue.type);
              li.appendChild(typeBadge);
    
              // Add message
              const messageSpan = document.createElement('span');
              messageSpan.textContent = issue.message;
              li.appendChild(messageSpan);
    
              // Add file location
              const locationSpan = document.createElement('div');
              locationSpan.style.fontSize = '0.85em';
              locationSpan.style.opacity = '0.7';
              locationSpan.textContent = \`\${issue.file}:\${issue.line}\`;
              li.appendChild(locationSpan);
    
              // Add click handler to navigate to issue
              li.addEventListener('click', () => {
                vscode.postMessage({
                  type: 'navigate',
                  file: issue.file,
                  line: issue.line,
                  column: issue.column
                });
              });
    
              issuesListElement.appendChild(li);
            });
    
            // Show message if no issues
            if (filteredIssues.length === 0) {
              const li = document.createElement('li');
              li.className = 'issue-item';
              li.textContent = state.filter === 'all'
                ? 'No issues found. Great job!'
                : \`No \${getTypeName(state.filter)} issues found.\`;
              issuesListElement.appendChild(li);
            }
          }
    
          // Update charts
          function updateCharts() {
            const canvas = document.getElementById('issues-chart');
            const ctx = canvas.getContext('2d');
    
            // Count issues by type
            const complexityIssues = state.issues.filter(issue => issue.type === 'complexity').length;
            const namingIssues = state.issues.filter(issue => issue.type === 'naming').length;
            const duplicationIssues = state.issues.filter(issue => issue.type === 'duplicate-code').length;
            const solidIssues = state.issues.filter(issue => issue.type === 'solid-violation').length;
    
            // Clear previous chart
            if (issuesChart) {
              issuesChart = null;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
    
            // Simple bar chart implementation
            const data = [
              { label: 'Complexity', value: complexityIssues, color: 'var(--chart-color-1)' },
              { label: 'Naming', value: namingIssues, color: 'var(--chart-color-2)' },
              { label: 'Duplication', value: duplicationIssues, color: 'var(--chart-color-3)' },
              { label: 'SOLID', value: solidIssues, color: 'var(--chart-color-4)' }
            ];
    
            // Sort by value
            data.sort((a, b) => b.value - a.value);
    
            // Simple bar chart
            const barWidth = 40;
            const barMargin = 20;
            const maxValue = Math.max(...data.map(d => d.value), 1);
            const chartHeight = canvas.height - 40;
    
            canvas.width = data.length * (barWidth + barMargin);
    
            // Draw bars
            data.forEach((item, index) => {
              const x = index * (barWidth + barMargin);
              const barHeight = (item.value / maxValue) * chartHeight;
              const y = chartHeight - barHeight;
    
              // Draw bar
              ctx.fillStyle = item.color;
              ctx.fillRect(x, y, barWidth, barHeight);
    
              // Draw label
              ctx.fillStyle = 'var(--foreground-color)';
              ctx.font = '10px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(item.label, x + barWidth / 2, chartHeight + 15);
    
              // Draw value
              ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
            });
          }
    
          // Helper function to get severity class
          function getSeverityClass(severity) {
            switch (severity) {
              case 0: return 'error';
              case 1: return 'warning';
              default: return 'info';
            }
          }
    
          // Helper function to get type name
          function getTypeName(type) {
            switch (type) {
              case 'complexity': return 'Complexity';
              case 'naming': return 'Naming';
              case 'duplicate-code': return 'Duplication';
              case 'solid-violation': return 'SOLID';
              default: return type;
            }
          }
    
          // Request initial data
          vscode.postMessage({ type: 'init' });
        })();
      </script>
    </body>
    
    </html>`;
  }
}
