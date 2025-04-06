// src/utils/ignoreUtils.ts
import * as vscode from "vscode";
import { IssueType } from "../models/codeIssue";

/**
 * Utility class for handling issue ignore comments in code
 */
export class IgnoreCommentHandler {
  // Default values
  private static readonly DEFAULT_IGNORE_REGEX =
    /clean-code-ignore:\s*([a-z-]+)(?:\s|$)/i;
  private static readonly IGNORE_ALL_TYPE = "all";

  /**
   * Gets the regex pattern for ignore comments based on settings
   */
  private static getIgnoreRegex(): RegExp {
    // Use default pattern since the format would be hard to make into a regex from settings
    return this.DEFAULT_IGNORE_REGEX;
  }

  /**
   * Checks if ignore comments are enabled in settings
   */
  private static isIgnoreCommentsEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    return config.get<boolean>("enableIgnoreComments", true);
  }

  /**
   * Checks if a specific issue is ignored by comments in the document
   * @param document The document being analyzed
   * @param lineNumber The line number where the issue occurs
   * @param issueType The type of issue to check for ignore comments
   * @returns True if the issue should be ignored, false otherwise
   */
  public static isIssueIgnored(
    document: vscode.TextDocument,
    lineNumber: number,
    issueType: IssueType
  ): boolean {
    // If ignore comments are disabled in settings, don't ignore anything
    if (!this.isIgnoreCommentsEnabled()) {
      return false;
    }

    // Check the line itself and the line before for ignore comments
    for (let i = Math.max(0, lineNumber - 1); i <= lineNumber; i++) {
      if (i >= document.lineCount) {
        continue;
      }

      const lineText = document.lineAt(i).text.trim();
      const match = lineText.match(this.getIgnoreRegex());

      if (match) {
        const ignoredType = match[1].toLowerCase();
        // Check if the comment is targeting all issues or this specific issue type
        if (ignoredType === this.IGNORE_ALL_TYPE || ignoredType === issueType) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Gets the ignore comment for a specific issue type
   * @param issueType The type of issue to generate an ignore comment for
   * @param includeComment Whether to include a descriptive comment
   * @returns The formatted ignore comment
   */
  public static getIgnoreComment(
    issueType: IssueType,
    includeComment: boolean | undefined = undefined
  ): string {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const format = config.get<string>(
      "ignoreCommentFormat",
      "// clean-code-ignore: {type}"
    );
    const includeDesc =
      includeComment !== undefined
        ? includeComment
        : config.get<boolean>("includeCommentDescriptions", true);

    // Replace the placeholder with the actual issue type
    let comment = format.replace("{type}", issueType);

    if (includeDesc) {
      comment += ` - This issue is intentionally ignored`;
    }

    return comment;
  }

  /**
   * Gets the ignore comment for ignoring all issue types
   * @param includeComment Whether to include a descriptive comment
   * @returns The formatted ignore comment for all issues
   */
  public static getIgnoreAllComment(
    includeComment: boolean | undefined = undefined
  ): string {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const format = config.get<string>(
      "ignoreCommentFormat",
      "// clean-code-ignore: {type}"
    );
    const includeDesc =
      includeComment !== undefined
        ? includeComment
        : config.get<boolean>("includeCommentDescriptions", true);

    // Replace the placeholder with 'all'
    let comment = format.replace("{type}", this.IGNORE_ALL_TYPE);

    if (includeDesc) {
      comment += ` - All clean code issues are intentionally ignored`;
    }

    return comment;
  }

  /**
   * Find all ignore comments in a document
   * @param document The document to scan for ignore comments
   * @returns An array of ranges representing the ignore comments
   */
  public static findAllIgnoreComments(
    document: vscode.TextDocument
  ): vscode.Range[] {
    const ignoreComments: vscode.Range[] = [];
    const regex = this.getIgnoreRegex();

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text.trim();

      if (regex.test(text)) {
        ignoreComments.push(line.range);
      }
    }

    return ignoreComments;
  }
}
