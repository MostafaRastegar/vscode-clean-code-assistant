// src/providers/documentationViewProvider.ts
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  DocumentationManager,
  DocumentationItem,
} from "../documentation/documentationManager";
import { IssueType } from "../models/codeIssue";

/**
 * Provides a webview panel for displaying clean code documentation
 */
export class DocumentationViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "clean-code-assistant.documentation";

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private documentationManager: DocumentationManager;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this.documentationManager = new DocumentationManager();
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

    // Set initial HTML content with topic list
    this.updateTopicList();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "showTopic":
          this.showTopic(message.topicId);
          break;

        case "showTopicList":
          this.updateTopicList();
          break;
      }
    });
  }

  /**
   * Shows documentation for a specific topic
   */
  public showTopic(topicId: string) {
    if (!this._view) {
      return;
    }

    const doc = this.documentationManager.getDocumentationForTopic(topicId);
    this._view.webview.html = this._getDocumentationHtml(doc, topicId);
  }

  /**
   * Shows documentation for a specific issue type
   */
  public showDocumentationForIssueType(issueType: IssueType) {
    if (!this._view) {
      return;
    }

    const doc =
      this.documentationManager.getDocumentationForIssueType(issueType);
    this._view.webview.html = this._getDocumentationHtml(doc, issueType);

    // Ensure the view is visible
    this._view.show(true);
  }

  /**
   * Updates the topic list view
   */
  private updateTopicList() {
    if (!this._view) {
      return;
    }

    const topics = this.documentationManager.getAllTopics();
    this._view.webview.html = this._getTopicListHtml(topics);
  }

  /**
   * Generates HTML for the topic list
   */
  private _getTopicListHtml(
    topics: Array<{ id: string; title: string; description: string }>
  ): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Clean Code Documentation</title>
            <style>
                :root {
                    --background-color: var(--vscode-editor-background);
                    --foreground-color: var(--vscode-editor-foreground);
                    --link-color: var(--vscode-textLink-foreground);
                    --border-color: var(--vscode-panel-border);
                }
                
                body {
                    background-color: var(--background-color);
                    color: var(--foreground-color);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    padding: 10px;
                    line-height: 1.5;
                }
                
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 15px;
                    font-weight: normal;
                }
                
                .topic-list {
                    list-style-type: none;
                    padding: 0;
                    margin: 0;
                }
                
                .topic-item {
                    margin-bottom: 15px;
                    border: 1px solid var(--border-color);
                    border-radius: 5px;
                    padding: 10px;
                    cursor: pointer;
                }
                
                .topic-item:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }
                
                .topic-title {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .topic-description {
                    font-size: 0.9em;
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <h1>Clean Code Documentation</h1>
            
            <ul class="topic-list">
                ${topics
                  .map(
                    (topic) => `
                    <li class="topic-item" data-topic-id="${topic.id}">
                        <div class="topic-title">${topic.title}</div>
                        <div class="topic-description">${topic.description}</div>
                    </li>
                `
                  )
                  .join("")}
            </ul>
            
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    // Add click handlers for topics
                    document.querySelectorAll('.topic-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const topicId = item.dataset.topicId;
                            vscode.postMessage({
                                type: 'showTopic',
                                topicId: topicId
                            });
                        });
                    });
                })();
            </script>
        </body>
        </html>`;
  }

  /**
   * Generates HTML for documentation content
   */
  private _getDocumentationHtml(
    doc: DocumentationItem,
    topicId: string
  ): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${doc.title}</title>
            <style>
                :root {
                    --background-color: var(--vscode-editor-background);
                    --foreground-color: var(--vscode-editor-foreground);
                    --link-color: var(--vscode-textLink-foreground);
                    --border-color: var(--vscode-panel-border);
                    --code-background: var(--vscode-textCodeBlock-background);
                }
                
                body {
                    background-color: var(--background-color);
                    color: var(--foreground-color);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    padding: 10px;
                    line-height: 1.5;
                }
                
                h1, h2, h3 {
                    font-weight: normal;
                }
                
                a {
                    color: var(--link-color);
                    text-decoration: none;
                }
                
                a:hover {
                    text-decoration: underline;
                }
                
                .back-link {
                    display: inline-block;
                    margin-bottom: 15px;
                    cursor: pointer;
                }
                
                .back-link:hover {
                    text-decoration: underline;
                }
                
                pre {
                    background-color: var(--code-background);
                    padding: 10px;
                    border-radius: 5px;
                    overflow: auto;
                    font-family: 'Courier New', Courier, monospace;
                }
                
                .example-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    grid-gap: 20px;
                    margin: 20px 0;
                }
                
                .example-bad, .example-good {
                    border: 1px solid var(--border-color);
                    border-radius: 5px;
                    padding: 10px;
                }
                
                .example-bad h3 {
                    color: #e15759;
                }
                
                .example-good h3 {
                    color: #59a14f;
                }
                
                .references {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color);
                }
            </style>
        </head>
        <body>
            <div class="back-link" id="back-link">← Back to topics</div>
            
            <h1>${doc.title}</h1>
            
            <p>${doc.description}</p>
            
            <h2>Key Principles</h2>
            <ul>
                ${doc.principles
                  .map((principle) => `<li>${principle}</li>`)
                  .join("")}
            </ul>
            
            <h2>Examples</h2>
            <div class="example-container">
                <div class="example-bad">
                    <h3>❌ Bad Practice</h3>
                    <pre><code>${this._escapeHtml(
                      doc.examples.bad
                    )}</code></pre>
                </div>
                
                <div class="example-good">
                    <h3>✅ Good Practice</h3>
                    <pre><code>${this._escapeHtml(
                      doc.examples.good
                    )}</code></pre>
                </div>
            </div>
            
            <div class="references">
                <h2>References</h2>
                <ul>
                    ${doc.references
                      .map(
                        (ref) =>
                          `<li><a href="#" data-url="${ref.url}">${ref.title}</a></li>`
                      )
                      .join("")}
                </ul>
            </div>
            
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    // Back button handler
                    document.getElementById('back-link').addEventListener('click', () => {
                        vscode.postMessage({
                            type: 'showTopicList'
                        });
                    });
                    
                    // Link handlers
                    document.querySelectorAll('.references a').forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const url = e.target.dataset.url;
                            if (url) {
                                vscode.postMessage({
                                    type: 'openExternalUrl',
                                    url: url
                                });
                            }
                        });
                    });
                })();
            </script>
        </body>
        </html>`;
  }

  /**
   * Utility function to escape HTML
   */
  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
