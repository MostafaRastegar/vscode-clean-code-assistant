// src/utils/statusBarManager.ts
import * as vscode from "vscode";

/**
 * Manages the status bar item for Clean Code Assistant
 */
export class StatusBarManager {
  private static instance: StatusBarManager;
  private statusBarItem: vscode.StatusBarItem;
  private isAnalyzing: boolean = false;

  private constructor() {
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "clean-code-assistant.analyzeCurrentDocument";
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  /**
   * Gets the singleton instance of StatusBarManager
   */
  public static getInstance(): StatusBarManager {
    if (!StatusBarManager.instance) {
      StatusBarManager.instance = new StatusBarManager();
    }
    return StatusBarManager.instance;
  }

  /**
   * Registers the status bar item with the extension context
   */
  public register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.statusBarItem);
  }

  /**
   * Sets analysis state to 'in progress'
   */
  public setAnalyzing(): void {
    this.isAnalyzing = true;
    this.updateStatusBar();
  }

  /**
   * Sets analysis state to 'completed'
   */
  public setCompleted(): void {
    this.isAnalyzing = false;
    this.updateStatusBar();
  }

  /**
   * Updates the status bar text and icon based on current state
   */
  private updateStatusBar(): void {
    const config = vscode.workspace.getConfiguration("cleanCodeAssistant");
    const analysisMode = config.get<string>("analysisMode", "onChange");

    if (this.isAnalyzing) {
      this.statusBarItem.text = "$(sync~spin) Clean Code: Analyzing...";
      this.statusBarItem.tooltip =
        "Clean Code Assistant is analyzing your code...";
    } else {
      const modeText = this.getModeText(analysisMode);
      this.statusBarItem.text = `$(code) Clean Code: ${modeText}`;
      this.statusBarItem.tooltip = "Click to analyze current document";
    }
  }

  /**
   * Gets text description for the current analysis mode
   */
  private getModeText(mode: string): string {
    switch (mode) {
      case "manual":
        return "Manual";
      case "onSave":
        return "On Save";
      case "onChange":
        return "On Change";
      default:
        return "Ready";
    }
  }

  /**
   * Updates the status bar when settings change
   */
  public onSettingsChanged(): void {
    this.updateStatusBar();
  }
}
