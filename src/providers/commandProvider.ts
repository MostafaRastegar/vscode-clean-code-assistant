// src/providers/commandProvider.ts
import * as vscode from "vscode";
import { CodeAnalyzer } from "../analyzers/analyzerInterface";

export function registerCommands(
  context: vscode.ExtensionContext,
  analyzers: CodeAnalyzer[]
): void {
  // Register extract function command
  const extractFunctionCommand = vscode.commands.registerCommand(
    "clean-code-assistant.extractFunction",
    async (document: vscode.TextDocument, range: vscode.Range) => {
      try {
        // Get function name from user
        const functionName = await vscode.window.showInputBox({
          prompt: "Enter a name for the extracted function",
          placeHolder: "newFunction",
        });

        if (!functionName) {
          return; // User cancelled
        }

        // Get the selected code
        const selectedCode = document.getText(range);

        // Create the new function
        const newFunction = `
function ${functionName}() {
    ${selectedCode
      .split("\n")
      .map((line) => "    " + line)
      .join("\n")
      .trim()}
}
`;

        // Insert the new function before the current function
        const edit = new vscode.WorkspaceEdit();

        // Find a good location to insert the new function (before the current function)
        let insertPosition: vscode.Position;

        // Try to find the start of the enclosing function
        const lines = document.getText().split("\n");
        let functionStartLine = range.start.line;

        while (functionStartLine > 0) {
          const line = lines[functionStartLine].trim();
          if (
            line.includes("function") ||
            line.includes("=>") ||
            line.includes("class")
          ) {
            break;
          }
          functionStartLine--;
        }

        // Insert before the enclosing function
        insertPosition = new vscode.Position(
          Math.max(0, functionStartLine - 1),
          0
        );
        edit.insert(document.uri, insertPosition, newFunction + "\n\n");

        // Replace the selected code with a call to the new function
        edit.replace(document.uri, range, `${functionName}()`);

        // Apply the edits
        await vscode.workspace.applyEdit(edit);

        vscode.window.showInformationMessage(
          `Successfully extracted function '${functionName}'`
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to extract function: ${error}`);
        console.error(error);
      }
    }
  );

  // Register extract duplicate code command
  const extractDuplicateCodeCommand = vscode.commands.registerCommand(
    "clean-code-assistant.extractDuplicateCode",
    async (document: vscode.TextDocument, range: vscode.Range) => {
      try {
        // Similar to extract function, but for duplicate code
        const functionName = await vscode.window.showInputBox({
          prompt: "Enter a name for the helper function",
          placeHolder: "helperFunction",
        });

        if (!functionName) {
          return; // User cancelled
        }

        // Get the selected code
        const selectedCode = document.getText(range);

        // Create the new function
        const newFunction = `
function ${functionName}() {
    ${selectedCode
      .split("\n")
      .map((line) => "    " + line)
      .join("\n")
      .trim()}
}
`;

        // Insert the new function at the top of the file
        const edit = new vscode.WorkspaceEdit();
        edit.insert(
          document.uri,
          new vscode.Position(0, 0),
          newFunction + "\n\n"
        );

        // Replace the selected code with a call to the new function
        edit.replace(document.uri, range, `${functionName}()`);

        // Apply the edits
        await vscode.workspace.applyEdit(edit);

        vscode.window.showInformationMessage(
          `Successfully extracted duplicate code to helper function '${functionName}'`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to extract duplicate code: ${error}`
        );
        console.error(error);
      }
    }
  );

  // Register other commands (simplified versions for demo)
  const extractClassCommand = vscode.commands.registerCommand(
    "clean-code-assistant.extractClass",
    () => {
      vscode.window.showInformationMessage(
        "Extract Class command is not yet implemented"
      );
    }
  );

  const splitInterfaceCommand = vscode.commands.registerCommand(
    "clean-code-assistant.splitInterface",
    () => {
      vscode.window.showInformationMessage(
        "Split Interface command is not yet implemented"
      );
    }
  );

  const applyStrategyPatternCommand = vscode.commands.registerCommand(
    "clean-code-assistant.applyStrategyPattern",
    () => {
      vscode.window.showInformationMessage(
        "Apply Strategy Pattern command is not yet implemented"
      );
    }
  );

  const applyDependencyInjectionCommand = vscode.commands.registerCommand(
    "clean-code-assistant.applyDependencyInjection",
    () => {
      vscode.window.showInformationMessage(
        "Apply Dependency Injection command is not yet implemented"
      );
    }
  );

  // Add all commands to context subscriptions
  context.subscriptions.push(
    extractFunctionCommand,
    extractDuplicateCodeCommand,
    extractClassCommand,
    splitInterfaceCommand,
    applyStrategyPatternCommand,
    applyDependencyInjectionCommand
  );
}
