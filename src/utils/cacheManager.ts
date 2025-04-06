// src/utils/cacheManager.ts
import * as vscode from "vscode";
import * as crypto from "crypto";
import { CodeIssue } from "../models/codeIssue";

/**
 * Tracks changes in documents and caches analysis results
 */
export class CacheManager {
  private static instance: CacheManager;

  // Cache of analysis results keyed by analyzer ID and content hash
  private cache = new Map<string, CachedResult>();

  // Maximum cache size (number of entries)
  private readonly maxCacheSize = 100;

  // Recently used cache keys for LRU eviction
  private recentlyUsed: string[] = [];

  private constructor() {}

  /**
   * Gets the singleton instance of CacheManager
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Gets cached analysis results if they exist and are valid
   * @param document The document being analyzed
   * @param analyzerId The ID of the analyzer
   * @param blockInfos Information about code blocks to check cache for
   * @returns Cached issues for valid blocks, null for blocks that need analysis
   */
  public getCachedResults(
    document: vscode.TextDocument,
    analyzerId: string,
    blockInfos: BlockInfo[]
  ): (CodeIssue[] | null)[] {
    const results: (CodeIssue[] | null)[] = [];

    for (const blockInfo of blockInfos) {
      const { startLine, endLine, content } = blockInfo;

      // Generate a cache key for this block
      const blockHash = this.hashContent(content);
      const cacheKey = `${analyzerId}_${blockHash}`;

      // Check if this block is in the cache
      if (this.cache.has(cacheKey)) {
        // Update recently used list (for LRU eviction)
        this.updateRecentlyUsed(cacheKey);

        // Get cached result
        const cachedResult = this.cache.get(cacheKey)!;

        // Adjust issue ranges based on block position
        const adjustedIssues = this.adjustIssueRanges(
          cachedResult.issues,
          startLine,
          cachedResult.startLine
        );

        results.push(adjustedIssues);
      } else {
        // Not in cache, need to analyze
        results.push(null);
      }
    }

    return results;
  }

  /**
   * Stores analysis results in the cache
   * @param document The document that was analyzed
   * @param analyzerId The ID of the analyzer
   * @param blockInfo Information about the code block
   * @param issues The issues found in this block
   */
  public storeResults(
    document: vscode.TextDocument,
    analyzerId: string,
    blockInfo: BlockInfo,
    issues: CodeIssue[]
  ): void {
    const { startLine, endLine, content } = blockInfo;

    // Generate a cache key for this block
    const blockHash = this.hashContent(content);
    const cacheKey = `${analyzerId}_${blockHash}`;

    // Store in cache
    this.cache.set(cacheKey, {
      issues: [...issues], // Clone the issues
      timestamp: Date.now(),
      startLine,
      endLine,
    });

    // Update recently used list
    this.updateRecentlyUsed(cacheKey);

    // Enforce cache size limit
    this.enforceCacheLimit();
  }

  /**
   * Divides a document into blocks for granular caching
   * @param document The document to divide
   * @param blockSize Recommended block size (in lines)
   * @returns Array of block information
   */
  public divideDocumentIntoBlocks(
    document: vscode.TextDocument,
    blockSize: number = 50
  ): BlockInfo[] {
    const lineCount = document.lineCount;
    const blocks: BlockInfo[] = [];

    // Natural blocks (dividing by functions/classes)
    const naturalBlocks = this.findNaturalBlocks(document);

    if (naturalBlocks.length > 0) {
      return naturalBlocks;
    }

    // If no natural blocks, use fixed size blocks
    for (let startLine = 0; startLine < lineCount; startLine += blockSize) {
      const endLine = Math.min(startLine + blockSize - 1, lineCount - 1);
      const content = this.getBlockContent(document, startLine, endLine);

      blocks.push({
        startLine,
        endLine,
        content,
      });
    }

    return blocks;
  }

  /**
   * Finds natural block divisions in the document (functions, classes, etc.)
   */
  private findNaturalBlocks(document: vscode.TextDocument): BlockInfo[] {
    const blocks: BlockInfo[] = [];
    const lineCount = document.lineCount;
    let currentBlockStart = 0;
    let braceCount = 0;
    let inBlock = false;

    for (let i = 0; i < lineCount; i++) {
      const line = document.lineAt(i).text;

      // Count braces to detect block boundaries
      for (const char of line) {
        if (char === "{") {
          if (!inBlock && braceCount === 0) {
            inBlock = true;
            currentBlockStart = Math.max(0, i - 1); // Include the line before opening brace
          }
          braceCount++;
        } else if (char === "}") {
          braceCount--;

          // End of a top-level block
          if (inBlock && braceCount === 0) {
            inBlock = false;

            // Add this block if it's of reasonable size
            if (i - currentBlockStart > 3) {
              const content = this.getBlockContent(
                document,
                currentBlockStart,
                i
              );
              blocks.push({
                startLine: currentBlockStart,
                endLine: i,
                content,
              });
            }
          }
        }
      }
    }

    // Handle case where the document doesn't have complete blocks
    if (blocks.length === 0) {
      return [];
    }

    // Fill in gaps between natural blocks
    const filledBlocks: BlockInfo[] = [];
    let lastEndLine = -1;

    for (const block of blocks) {
      // If there's a gap before this block, add it as a block
      if (block.startLine > lastEndLine + 1) {
        const gapStart = lastEndLine + 1;
        const gapEnd = block.startLine - 1;
        const gapContent = this.getBlockContent(document, gapStart, gapEnd);

        filledBlocks.push({
          startLine: gapStart,
          endLine: gapEnd,
          content: gapContent,
        });
      }

      // Add the natural block
      filledBlocks.push(block);
      lastEndLine = block.endLine;
    }

    // If there's a gap after the last block, add it
    if (lastEndLine < lineCount - 1) {
      const gapContent = this.getBlockContent(
        document,
        lastEndLine + 1,
        lineCount - 1
      );
      filledBlocks.push({
        startLine: lastEndLine + 1,
        endLine: lineCount - 1,
        content: gapContent,
      });
    }

    return filledBlocks;
  }

  /**
   * Gets the content of a block as a string
   */
  private getBlockContent(
    document: vscode.TextDocument,
    startLine: number,
    endLine: number
  ): string {
    let content = "";
    for (let i = startLine; i <= endLine; i++) {
      content += document.lineAt(i).text + "\n";
    }
    return content;
  }

  /**
   * Hashes content to generate a unique identifier
   */
  private hashContent(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Adjusts issue ranges based on the current position of a block
   */
  private adjustIssueRanges(
    issues: CodeIssue[],
    currentStartLine: number,
    originalStartLine: number
  ): CodeIssue[] {
    const lineDiff = currentStartLine - originalStartLine;

    if (lineDiff === 0) {
      return issues;
    }

    return issues.map((issue) => {
      // Create a new issue with adjusted range
      const adjustedIssue: CodeIssue = {
        ...issue,
        range: new vscode.Range(
          issue.range.start.line + lineDiff,
          issue.range.start.character,
          issue.range.end.line + lineDiff,
          issue.range.end.character
        ),
      };

      return adjustedIssue;
    });
  }

  /**
   * Updates the recently used list for LRU cache eviction
   */
  private updateRecentlyUsed(key: string): void {
    // Remove from current position (if it exists)
    const index = this.recentlyUsed.indexOf(key);
    if (index !== -1) {
      this.recentlyUsed.splice(index, 1);
    }

    // Add to the front (most recently used)
    this.recentlyUsed.unshift(key);
  }

  /**
   * Enforces cache size limit using LRU eviction policy
   */
  private enforceCacheLimit(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Evict least recently used entries
    while (
      this.cache.size > this.maxCacheSize &&
      this.recentlyUsed.length > 0
    ) {
      const lruKey = this.recentlyUsed.pop();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }

  /**
   * Clears the cache for a specific analyzer or all analyzers
   */
  public clearCache(analyzerId?: string): void {
    if (analyzerId) {
      // Remove entries for specific analyzer
      const keysToRemove: string[] = [];

      this.cache.forEach((_, key) => {
        if (key.startsWith(`${analyzerId}_`)) {
          keysToRemove.push(key);
        }
      });

      keysToRemove.forEach((key) => {
        this.cache.delete(key);

        // Also remove from recently used list
        const index = this.recentlyUsed.indexOf(key);
        if (index !== -1) {
          this.recentlyUsed.splice(index, 1);
        }
      });
    } else {
      // Clear entire cache
      this.cache.clear();
      this.recentlyUsed = [];
    }
  }
}

/**
 * Information about a block of code for caching
 */
export interface BlockInfo {
  startLine: number;
  endLine: number;
  content: string;
}

/**
 * Structure for cached analysis results
 */
interface CachedResult {
  issues: CodeIssue[];
  timestamp: number;
  startLine: number;
  endLine: number;
}
