// src/analyzers/duplicateCodeAnalyzer.ts
import * as vscode from "vscode";
import { CodeAnalyzer } from "./analyzerInterface";
import {
  AnalyzerResult,
  CodeIssue,
  IssueSeverity,
  IssueType,
} from "../models/codeIssue";
import { getLineText } from "../utils/documentUtils";

export class DuplicateCodeAnalyzer implements CodeAnalyzer {
  id = "duplicate-code";
  name = "Duplicate Code Analyzer";
  description = "Identifies duplicate code blocks that could be refactored";

  async analyze(document: vscode.TextDocument): Promise<AnalyzerResult> {
    const issues: CodeIssue[] = [];
    const content = document.getText();

    // Get config
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const minBlockSize = config.get<number>("minDuplicateBlockSize", 5);

    // Find duplicated blocks
    const duplicates = this.findDuplicateBlocks(document, minBlockSize);

    // Create issues for all duplicated blocks
    duplicates.forEach((duplicate) => {
      const { blocks, content: blockContent } = duplicate;

      // Create an issue for each duplicate block except the first one
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const range = new vscode.Range(
          block.startLine,
          0,
          block.endLine,
          document.lineAt(block.endLine).text.length
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

  /**
   * Finds duplicate code blocks in a document
   * @param document The document to analyze
   * @param minBlockSize Minimum number of lines to consider as a block
   * @returns Array of duplicate blocks with their positions
   */
  private findDuplicateBlocks(
    document: vscode.TextDocument,
    minBlockSize: number
  ): DuplicateBlock[] {
    const lineCount = document.lineCount;
    const blocksByContent = new Map<string, CodeBlock[]>();
    const duplicates: DuplicateBlock[] = [];

    // Sliding window approach to find duplicate blocks
    for (
      let startLine = 0;
      startLine < lineCount - minBlockSize + 1;
      startLine++
    ) {
      // Try different block sizes, from minimum to larger ones
      for (let size = minBlockSize; startLine + size <= lineCount; size++) {
        const endLine = startLine + size - 1;

        // Extract the block content
        let blockContent = "";
        for (let i = startLine; i <= endLine; i++) {
          blockContent += getLineText(document, i).trim() + "\n";
        }

        // Ignore blocks that are too simple (e.g., just brackets, empty lines)
        if (this.isBlockTooSimple(blockContent)) {
          continue;
        }

        // Check if we've seen this block before
        if (!blocksByContent.has(blockContent)) {
          blocksByContent.set(blockContent, []);
        }

        const blocks = blocksByContent.get(blockContent)!;

        // Add current block to the list
        blocks.push({
          startLine,
          endLine,
        });

        // If we found a duplicate, add it to the result
        if (blocks.length === 2) {
          duplicates.push({
            blocks: [...blocks], // Copy the array
            content: blockContent,
          });
        } else if (blocks.length > 2) {
          // Update the existing duplicate record
          const existingDuplicate = duplicates.find(
            (d) => d.content === blockContent
          );
          if (existingDuplicate) {
            existingDuplicate.blocks.push({
              startLine,
              endLine,
            });
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * Checks if a code block is too simple to be considered for duplication analysis
   * (e.g., blocks with just brackets, single statements, etc.)
   */
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
