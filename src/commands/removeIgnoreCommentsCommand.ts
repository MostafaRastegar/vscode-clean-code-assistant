// src/commands/removeIgnoreCommentsCommand.ts
import * as vscode from "vscode";
import { IgnoreCommentHandler } from "../utils/ignoreUtils";

/**
 * Command to remove all clean-code-ignore comments from a document or project
 */
export function registerRemoveIgnoreCommentsCommand(
  context: vscode.ExtensionContext
): void {
  // Command to remove ignore comments from the current file
  const removeFromCurrentFileCommand = vscode.commands.registerCommand(
    "clean-code-assistant.removeIgnoreCommentsFromCurrentFile",
    async () => {
      await removeIgnoreCommentsFromCurrentFile();
    }
  );

  // Command to remove ignore comments from all files in the workspace
  const removeFromAllFilesCommand = vscode.commands.registerCommand(
    "clean-code-assistant.removeIgnoreCommentsFromAllFiles",
    async () => {
      await removeIgnoreCommentsFromAllFiles();
    }
  );

  context.subscriptions.push(
    removeFromCurrentFileCommand,
    removeFromAllFilesCommand
  );
}

/**
 * Removes all clean-code-ignore comments from the current file
 */
async function removeIgnoreCommentsFromCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(
      "No active file. Please open a file to remove ignore comments."
    );
    return;
  }

  const document = editor.document;
  await removeIgnoreCommentsFromDocument(document);
}

/**
 * Removes all clean-code-ignore comments from all files in the workspace
 */
async function removeIgnoreCommentsFromAllFiles(): Promise<void> {
  // Get all workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showWarningMessage(
      "No workspace folders found. Please open a folder to remove ignore comments from all files."
    );
    return;
  }

  // Confirm with the user before proceeding
  const response = await vscode.window.showWarningMessage(
    "This will remove all clean-code-ignore comments from all JavaScript and TypeScript files in the workspace. Are you sure?",
    { modal: true },
    "Yes",
    "No"
  );

  if (response !== "Yes") {
    return;
  }

  // Show progress indicator
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Removing clean-code-ignore comments",
      cancellable: true,
    },
    async (progress, token) => {
      let filesProcessed = 0;

      // Find all TypeScript and JavaScript files in the workspace
      const tsFiles = await vscode.workspace.findFiles(
        "**/*.{ts,js,tsx,jsx}",
        "**/node_modules/**"
      );

      progress.report({ message: `Found ${tsFiles.length} files to process` });

      // Process each file
      for (const fileUri of tsFiles) {
        if (token.isCancellationRequested) {
          break;
        }

        try {
          // Open the document
          const document = await vscode.workspace.openTextDocument(fileUri);
          await removeIgnoreCommentsFromDocument(document);

          filesProcessed++;
          progress.report({
            message: `Processed ${filesProcessed} of ${tsFiles.length} files`,
            increment: (1 / tsFiles.length) * 100,
          });
        } catch (error) {
          console.error(`Error processing file ${fileUri.fsPath}:`, error);
        }
      }

      vscode.window.showInformationMessage(
        `Removed clean-code-ignore comments from ${filesProcessed} files.`
      );
    }
  );
}

/**
 * Removes all clean-code-ignore comments from a document
 */
async function removeIgnoreCommentsFromDocument(
  document: vscode.TextDocument
): Promise<void> {
  // Find all ignore comments in the document
  const ignoreComments = IgnoreCommentHandler.findAllIgnoreComments(document);

  if (ignoreComments.length === 0) {
    return; // No comments to remove
  }

  // Create a workspace edit to remove all comments
  const edit = new vscode.WorkspaceEdit();

  // Sort ranges in reverse order to avoid position shifting after deletions
  ignoreComments.sort((a, b) => b.start.line - a.start.line);

  // Delete each comment
  for (const range of ignoreComments) {
    edit.delete(document.uri, range);
  }

  // Apply the edits
  await vscode.workspace.applyEdit(edit);

  // Save the document if it's dirty
  if (document.isDirty) {
    await document.save();
  }
}
