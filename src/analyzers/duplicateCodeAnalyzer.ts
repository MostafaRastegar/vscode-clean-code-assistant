// src/analyzers/duplicateCodeAnalyzer.ts
import * as vscode from "vscode";
import * as ts from "typescript";
import { AnalyzerPriority, CodeAnalyzer } from "./analyzerInterface";
import {
  AnalyzerResult,
  CodeIssue,
  IssueSeverity,
  IssueType,
} from "../models/codeIssue";
import { getLineText } from "../utils/documentUtils";
import { BlockInfo } from "../utils/cacheManager";
import { IgnoreCommentHandler } from "../utils/ignoreUtils";

export class DuplicateCodeAnalyzer implements CodeAnalyzer {
  id = "duplicate-code";
  name = "Duplicate Code Analyzer";
  description = "Identifies duplicate code blocks that could be refactored";
  priority = AnalyzerPriority.Medium; // More intensive algorithm
  supportsBlockAnalysis = true; // Support for block-based analysis

  async analyze(
    document: vscode.TextDocument,
    ast?: ts.SourceFile,
    blockInfo?: BlockInfo
  ): Promise<AnalyzerResult> {
    const issues: CodeIssue[] = [];
    let lineOffset = 0;

    // If analyzing a specific block, adjust line offset
    if (blockInfo) {
      lineOffset = blockInfo.startLine;
    }

    // Get config
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const minBlockSize = config.get<number>("minDuplicateBlockSize", 5);

    // Find duplicated blocks using the optimized algorithm
    const duplicates = this.findDuplicateBlocksOptimized(
      document,
      minBlockSize,
      blockInfo
    );

    // Create issues for all duplicated blocks
    duplicates.forEach((duplicate) => {
      const { blocks, content: blockContent } = duplicate;

      // Create an issue for each duplicate block except the first one
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];

        // FIXED: Standardize position adjustment
        let startLine, endLine;

        if (blockInfo) {
          // Use a single adjustment approach consistently
          startLine = block.startLine + lineOffset;
          endLine = block.endLine + lineOffset;
        } else {
          startLine = block.startLine;
          endLine = block.endLine;
        }

        // Check if this duplicate code issue is ignored via comment at the start of the block
        if (
          IgnoreCommentHandler.isIssueIgnored(
            document,
            startLine,
            IssueType.DuplicateCode
          )
        ) {
          // Skip this issue if it's ignored
          continue;
        }

        const range = new vscode.Range(
          startLine,
          0,
          endLine,
          document.lineAt(endLine).text.length
        );

        const issue: CodeIssue = {
          type: IssueType.DuplicateCode,
          message: `This code block is duplicated ${blocks.length} times in this file.`,
          range: range,
          severity: IssueSeverity.Warning,
          suggestions: [
            "Extract the duplicated code into a reusable function",
            "Apply DRY (Don't Repeat Yourself) principle",
            "Consider using design patterns to eliminate duplication",
          ],
        };

        issues.push(issue);
      }
    });

    return { issues };
  }

  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    return config.get<boolean>("enableDuplicateCodeAnalyzer", true);
  }

  // The rest of the analyzer code remains unchanged...
  // (findDuplicateBlocksOptimized, processBlockHash, filterAndVerifyDuplicates, etc.)

  private findDuplicateBlocksOptimized(
    document: vscode.TextDocument,
    minBlockSize: number,
    blockInfo?: BlockInfo
  ): DuplicateBlock[] {
    // If analyzing a block, use only the lines in that block
    const startLine = blockInfo ? 0 : 0;
    const lineCount = blockInfo
      ? blockInfo.content.split("\n").length - 1
      : document.lineCount;

    // If the document is too small, return empty result
    if (lineCount < minBlockSize * 2) {
      return [];
    }

    // Step 1: Calculate line hashes for each line to speed up comparison
    const lineHashes: number[] = [];
    for (let i = 0; i < lineCount; i++) {
      const line = blockInfo
        ? blockInfo.content.split("\n")[i].trim()
        : getLineText(document, i).trim();
      lineHashes.push(this.simpleHash(line));
    }
    // Step 2: Calculate block hashes using rolling hash technique
    const blocksByHash = new Map<number, CodeBlock[]>();
    const duplicates: DuplicateBlock[] = [];

    // For each possible block start position
    for (
      let startLine = 0;
      startLine <= lineCount - minBlockSize;
      startLine++
    ) {
      // Calculate initial hash for block
      let blockHash = 0;
      for (let i = 0; i < minBlockSize; i++) {
        blockHash = this.combineHashes(blockHash, lineHashes[startLine + i], i);
      }

      this.processBlockHash(
        blockHash,
        startLine,
        startLine + minBlockSize - 1,
        document,
        blocksByHash,
        duplicates
      );

      // Rolling window - try different block sizes
      for (
        let currentSize = minBlockSize + 1;
        startLine + currentSize <= lineCount;
        currentSize++
      ) {
        // Add the next line to the rolling hash
        const nextLineHash = lineHashes[startLine + currentSize - 1];
        blockHash = this.addToRollingHash(
          blockHash,
          nextLineHash,
          currentSize - 1
        );

        // Check for duplicates with this size
        this.processBlockHash(
          blockHash,
          startLine,
          startLine + currentSize - 1,
          document,
          blocksByHash,
          duplicates
        );
      }
    }

    // Step 3: Verify hash collisions and filter insignificant duplicates
    return this.filterAndVerifyDuplicates(duplicates, document);
  }

  private processBlockHash(
    blockHash: number,
    startLine: number,
    endLine: number,
    document: vscode.TextDocument,
    blocksByHash: Map<number, CodeBlock[]>,
    duplicates: DuplicateBlock[]
  ): void {
    const currentBlock: CodeBlock = { startLine, endLine };

    // We've seen this hash before
    if (blocksByHash.has(blockHash)) {
      const existingBlocks = blocksByHash.get(blockHash)!;

      // Check if this is a new duplicate
      if (existingBlocks.length === 1) {
        // This is the second occurrence, create a new duplicate group
        const blockContent = this.getBlockContent(document, startLine, endLine);

        // Don't track duplicates of very simple blocks
        if (!this.isBlockTooSimple(blockContent)) {
          duplicates.push({
            blocks: [...existingBlocks, currentBlock],
            content: blockContent,
          });
        }
      } else if (existingBlocks.length > 1) {
        // This hash already has multiple blocks, find the existing duplicate
        const existingDuplicate = duplicates.find(
          (d) =>
            d.blocks.length === existingBlocks.length &&
            d.blocks[0].startLine === existingBlocks[0].startLine
        );

        if (existingDuplicate) {
          existingDuplicate.blocks.push(currentBlock);
        }
      }

      // Add the current block to blocks with this hash
      existingBlocks.push(currentBlock);
    } else {
      // First time seeing this hash
      blocksByHash.set(blockHash, [currentBlock]);
    }
  }

  private filterAndVerifyDuplicates(
    duplicates: DuplicateBlock[],
    document: vscode.TextDocument
  ): DuplicateBlock[] {
    // Set to track unique duplicates by their content
    const uniqueDuplicatesByContent = new Map<string, DuplicateBlock>();

    // Process each potential duplicate
    duplicates.forEach((duplicate) => {
      const blocks = duplicate.blocks;
      const firstBlockContent = this.getBlockContent(
        document,
        blocks[0].startLine,
        blocks[0].endLine
      );

      // For duplicates from the same hash, verify content matches
      const verifiedBlocks = [blocks[0]]; // First block is the reference

      // Check remaining blocks actually match (to handle hash collisions)
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const blockContent = this.getBlockContent(
          document,
          block.startLine,
          block.endLine
        );

        if (blockContent === firstBlockContent) {
          verifiedBlocks.push(block);
        }
      }

      // Only add if we have at least two matching blocks
      if (verifiedBlocks.length >= 2) {
        uniqueDuplicatesByContent.set(firstBlockContent, {
          blocks: verifiedBlocks,
          content: firstBlockContent,
        });
      }
    });

    // Filter overlapping duplicates - keep only the largest blocks
    const result: DuplicateBlock[] = [];
    const addedRanges = new Set<string>();

    // Process duplicates from largest to smallest
    Array.from(uniqueDuplicatesByContent.values())
      .sort((a, b) => {
        // Sort by block size (end - start) in descending order
        const aSize = a.blocks[0].endLine - a.blocks[0].startLine;
        const bSize = b.blocks[0].endLine - b.blocks[0].startLine;
        return bSize - aSize;
      })
      .forEach((duplicate) => {
        // Filter out blocks that overlap with already added blocks
        const nonOverlappingBlocks = duplicate.blocks.filter((block) => {
          const blockKey = `${block.startLine}-${block.endLine}`;

          // Check if this block overlaps with any previously added block
          if (addedRanges.has(blockKey)) {
            return false;
          }

          // Check if it's contained within a previously added block
          for (let line = block.startLine; line <= block.endLine; line++) {
            if (this.isLineInAnyAddedRange(line, addedRanges)) {
              return false;
            }
          }

          // No overlap, add this block
          addedRanges.add(blockKey);
          return true;
        });

        // Only add duplicates with at least 2 instances
        if (nonOverlappingBlocks.length >= 2) {
          result.push({
            blocks: nonOverlappingBlocks,
            content: duplicate.content,
          });
        }
      });

    return result;
  }

  private isLineInAnyAddedRange(
    line: number,
    addedRanges: Set<string>
  ): boolean {
    for (const rangeKey of addedRanges) {
      const [start, end] = rangeKey.split("-").map(Number);
      if (line >= start && line <= end) {
        return true;
      }
    }
    return false;
  }

  private getBlockContent(
    document: vscode.TextDocument,
    startLine: number,
    endLine: number
  ): string {
    let content = "";
    for (let i = startLine; i <= endLine; i++) {
      content += getLineText(document, i).trim() + "\n";
    }
    return content;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    if (str.length === 0) {
      return hash;
    }

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return hash;
  }

  private combineHashes(
    currentHash: number,
    newHash: number,
    position: number
  ): number {
    // Simple polynomial rolling hash function
    return currentHash * 37 + newHash + position;
  }

  private addToRollingHash(
    currentHash: number,
    newHash: number,
    position: number
  ): number {
    return currentHash * 7 + newHash + position;
  }

  private isBlockTooSimple(content: string): boolean {
    // Remove whitespace and check content length
    const trimmedContent = content.replace(/\s+/g, "");
    if (trimmedContent.length < 20) {
      return true;
    }

    // Check if the block contains meaningful code, not just brackets and punctuation
    const meaningfulContentRatio =
      trimmedContent.replace(/[{}\[\]();,."']/g, "").length /
      trimmedContent.length;
    return meaningfulContentRatio < 0.5;
  }
}

/**
 * Represents a block of code with start and end line numbers
 */
interface CodeBlock {
  startLine: number;
  endLine: number;
}

/**
 * Represents a set of duplicate code blocks
 */
interface DuplicateBlock {
  blocks: CodeBlock[];
  content: string;
}
