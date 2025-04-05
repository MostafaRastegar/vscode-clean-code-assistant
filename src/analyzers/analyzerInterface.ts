// src/analyzers/analyzerInterface.ts
import * as vscode from "vscode";
import { AnalyzerResult } from "../models/codeIssue";

export interface CodeAnalyzer {
  id: string;
  name: string;
  description: string;
  analyze(document: vscode.TextDocument): Promise<AnalyzerResult>;
  isEnabled(): boolean;
}
