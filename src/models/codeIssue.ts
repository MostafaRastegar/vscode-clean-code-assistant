// src/models/codeIssue.ts
import * as vscode from "vscode";

export enum IssueSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export enum IssueType {
  Complexity = "complexity",
  Naming = "naming",
  DuplicateCode = "duplicate-code",
  DeadCode = "dead-code",
  SolidViolation = "solid-violation",
  AntiPattern = "anti-pattern",
  CognitiveComplexity = "cognitive-complexity",
  Dependency = "dependency",
}

export interface CodeIssue {
  type: IssueType;
  message: string;
  range: vscode.Range;
  severity: IssueSeverity;
  suggestions?: string[];
  documentation?: string;
}

export interface AnalyzerResult {
  issues: CodeIssue[];
}
