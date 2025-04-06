// src/analyzers/analyzerInterface.ts
import * as vscode from "vscode";
import * as ts from "typescript";
import { AnalyzerResult } from "../models/codeIssue";
import { BlockInfo } from "../utils/cacheManager";

/**
 * Priority levels for analyzers
 * - High: Quick to execute, run immediately
 * - Medium: Moderate execution time, run after high priority
 * - Low: Slow execution time, run after medium priority or defer to idle time
 */
export enum AnalyzerPriority {
  High = 0,
  Medium = 1,
  Low = 2,
}

export interface CodeAnalyzer {
  id: string;
  name: string;
  description: string;
  priority: AnalyzerPriority;

  /**
   * Analyzes a document or specific block of a document
   * @param document The document to analyze
   * @param ast Optional pre-parsed AST
   * @param blockInfo Optional information about a specific block to analyze
   * @returns Analysis results
   */
  analyze(
    document: vscode.TextDocument,
    ast?: ts.SourceFile,
    blockInfo?: BlockInfo
  ): Promise<AnalyzerResult>;

  /**
   * Determines if this analyzer is enabled via configuration
   */
  isEnabled(): boolean;

  /**
   * Indicates whether this analyzer supports block-based analysis for caching
   * If false, the entire document will always be analyzed
   */
  supportsBlockAnalysis?: boolean;
}
