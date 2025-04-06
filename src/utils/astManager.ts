// src/utils/astManager.ts
import * as ts from "typescript";
import * as vscode from "vscode";

/**
 * Manages the creation and caching of TypeScript ASTs for documents
 */
export class ASTManager {
  private static instance: ASTManager;
  private astCache = new Map<string, ts.SourceFile>();

  private constructor() {}

  /**
   * Gets the singleton instance of ASTManager
   */
  public static getInstance(): ASTManager {
    if (!ASTManager.instance) {
      ASTManager.instance = new ASTManager();
    }
    return ASTManager.instance;
  }

  /**
   * Gets or creates a TypeScript AST for a document
   * @param document The document to parse
   * @param forceRefresh Whether to force a refresh of the cached AST
   * @returns The TypeScript SourceFile representing the AST
   */
  public getAST(
    document: vscode.TextDocument,
    forceRefresh = false
  ): ts.SourceFile {
    const key = this.getCacheKey(document);

    // If we have a cached version and don't need to refresh, return it
    if (!forceRefresh && this.astCache.has(key)) {
      return this.astCache.get(key)!;
    }

    // Otherwise, create a new AST
    const content = document.getText();
    const sourceFile = ts.createSourceFile(
      document.fileName,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // Cache the AST
    this.astCache.set(key, sourceFile);

    return sourceFile;
  }

  /**
   * Clears the AST for a specific document or all documents
   * @param document Optional document to clear the AST for
   */
  public clearAST(document?: vscode.TextDocument): void {
    if (document) {
      const key = this.getCacheKey(document);
      this.astCache.delete(key);
    } else {
      this.astCache.clear();
    }
  }

  /**
   * Generates a cache key for a document
   */
  private getCacheKey(document: vscode.TextDocument): string {
    // Include version to ensure we don't use stale ASTs
    return `${document.uri.toString()}_v${document.version}`;
  }
}
