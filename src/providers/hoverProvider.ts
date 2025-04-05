// src/providers/hoverProvider.ts
import * as vscode from "vscode";
import { DocumentationManager } from "../documentation/documentationManager";
import { IssueType } from "../models/codeIssue";

/**
 * Provides hover information for clean code issues
 */
export class CleanCodeHoverProvider implements vscode.HoverProvider {
  private documentationManager: DocumentationManager;

  constructor() {
    this.documentationManager = new DocumentationManager();
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // Get diagnostics at the position
    const diagnostics = vscode.languages
      .getDiagnostics(document.uri)
      .filter(
        (diagnostic) =>
          diagnostic.source === "Clean Code Assistant" &&
          diagnostic.range.contains(position)
      );

    if (diagnostics.length === 0) {
      return null;
    }

    // Use the first diagnostic
    const diagnostic = diagnostics[0];
    const issueType = diagnostic.code as IssueType;

    // Get documentation for the issue type
    const doc =
      this.documentationManager.getDocumentationForIssueType(issueType);

    // Create hover markdown
    const hoverMarkdown = new vscode.MarkdownString();
    hoverMarkdown.isTrusted = true;

    hoverMarkdown.appendMarkdown(`## ${doc.title}\n\n`);
    hoverMarkdown.appendMarkdown(`${doc.description}\n\n`);

    // Add key principles
    hoverMarkdown.appendMarkdown(`### Key Principles\n`);
    doc.principles.slice(0, 3).forEach((principle) => {
      hoverMarkdown.appendMarkdown(`- ${principle}\n`);
    });

    // Add link to full documentation
    hoverMarkdown.appendMarkdown(
      `\n[Show Full Documentation](command:clean-code-assistant.showDocumentation?${encodeURIComponent(
        JSON.stringify({ issueType })
      )})`
    );

    return new vscode.Hover(hoverMarkdown);
  }
}
