// src/utils/analysisScheduler.ts
import * as vscode from "vscode";
import * as ts from "typescript";
import { CodeAnalyzer, AnalyzerPriority } from "../analyzers/analyzerInterface";
import { ASTManager } from "./astManager";
import { DiagnosticManager } from "./diagnosticManager";
import { CacheManager, BlockInfo } from "./cacheManager";
import { CodeIssue } from "../models/codeIssue";

/**
 * Schedules and runs analyzers progressively based on priority
 */
export class AnalysisScheduler {
  private static instance: AnalysisScheduler;
  private currentAnalysisToken: string | null = null;

  // Delays between priority levels in milliseconds
  private readonly priorityDelays = [
    0, // High priority: immediate
    200, // Medium priority: slight delay
    500, // Low priority: longer delay
  ];

  private constructor() {}

  /**
   * Gets the singleton instance of AnalysisScheduler
   */
  public static getInstance(): AnalysisScheduler {
    if (!AnalysisScheduler.instance) {
      AnalysisScheduler.instance = new AnalysisScheduler();
    }
    return AnalysisScheduler.instance;
  }

  /**
   * Schedules and runs analyzer prioritization for a document
   * @param document Document to analyze
   * @param analyzers All available analyzers
   */
  public async scheduleAnalysis(
    document: vscode.TextDocument,
    analyzers: CodeAnalyzer[]
  ): Promise<void> {
    // Generate a unique token for this analysis run
    const analysisToken = `analysis_${Date.now()}_${Math.random()}`;
    this.currentAnalysisToken = analysisToken;

    // Get enabled analyzers and organize by priority
    const enabledAnalyzers = analyzers.filter((analyzer) =>
      analyzer.isEnabled()
    );

    // Group analyzers by priority
    const analyzersByPriority = new Map<AnalyzerPriority, CodeAnalyzer[]>();

    for (const priority of [
      AnalyzerPriority.High,
      AnalyzerPriority.Medium,
      AnalyzerPriority.Low,
    ]) {
      analyzersByPriority.set(
        priority,
        enabledAnalyzers.filter((analyzer) => analyzer.priority === priority)
      );
    }

    // Create/get AST once for all analyzers
    const astManager = ASTManager.getInstance();
    const ast = astManager.getAST(document, true);

    // Initialize cache manager
    const cacheManager = CacheManager.getInstance();

    // Store all found issues
    const allIssues: CodeIssue[] = [];
    const diagnosticManager = DiagnosticManager.getInstance();

    // Execute analyzers in order of priority with delays between groups
    for (const priority of [
      AnalyzerPriority.High,
      AnalyzerPriority.Medium,
      AnalyzerPriority.Low,
    ]) {
      const analyzersInGroup = analyzersByPriority.get(priority) || [];

      if (analyzersInGroup.length === 0) {
        continue;
      }

      // Introduce a delay between priority groups, except for high priority
      if (priority !== AnalyzerPriority.High) {
        await this.delay(this.priorityDelays[priority]);

        // Check if analysis was cancelled
        if (this.currentAnalysisToken !== analysisToken) {
          return;
        }
      }

      // Process each analyzer in this priority group
      for (const analyzer of analyzersInGroup) {
        // Check if analysis was cancelled
        if (this.currentAnalysisToken !== analysisToken) {
          return;
        }

        // If analyzer supports block-based analysis, use caching
        if (analyzer.supportsBlockAnalysis) {
          const issuesFromAnalyzer = await this.processWithCaching(
            document,
            analyzer,
            ast
          );
          allIssues.push(...issuesFromAnalyzer);
        } else {
          // Run traditional whole-document analysis
          const result = await analyzer.analyze(document, ast);
          allIssues.push(...result.issues);
        }
      }

      // Update diagnostics incrementally after each priority group
      diagnosticManager.updateDiagnostics(document, allIssues);
    }
  }

  /**
   * Processes an analyzer with caching support
   */
  private async processWithCaching(
    document: vscode.TextDocument,
    analyzer: CodeAnalyzer,
    ast: ts.SourceFile
  ): Promise<CodeIssue[]> {
    const cacheManager = CacheManager.getInstance();
    const allIssues: CodeIssue[] = [];

    // Divide document into blocks for granular caching
    const blockSize = 50; // Lines per block
    const blocks = cacheManager.divideDocumentIntoBlocks(document, blockSize);

    // Get cached results for each block
    const cachedResults = cacheManager.getCachedResults(
      document,
      analyzer.id,
      blocks
    );

    // Process each block
    for (let i = 0; i < blocks.length; i++) {
      // If cache hit, use cached results
      if (cachedResults[i] !== null) {
        allIssues.push(...cachedResults[i]!);
        continue;
      }

      // Cache miss, need to analyze this block
      const blockInfo = blocks[i];
      const result = await analyzer.analyze(document, ast, blockInfo);

      // Store results in cache for future use
      cacheManager.storeResults(
        document,
        analyzer.id,
        blockInfo,
        result.issues
      );

      // Add issues to collection
      allIssues.push(...result.issues);

      // Check if analysis was cancelled
      if (this.currentAnalysisToken === null) {
        break;
      }
    }

    return allIssues;
  }

  /**
   * Cancels the current analysis run
   */
  public cancelCurrentAnalysis(): void {
    this.currentAnalysisToken = null;
  }

  /**
   * Simple promise-based delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
