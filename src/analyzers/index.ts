// src/analyzers/index.ts
import * as vscode from "vscode";
import { CodeAnalyzer } from "./analyzerInterface";
import { ComplexityAnalyzer } from "./complexityAnalyzer";
import { NamingAnalyzer } from "./namingAnalyzer";
import { DuplicateCodeAnalyzer } from "./duplicateCodeAnalyzer";
import { SolidPrinciplesAnalyzer } from "./solidPrinciplesAnalyzer";
import { AntiPatternAnalyzer } from "./antiPatternAnalyzer";
// We will add more analyzers in the future

export function initializeAnalyzers(
  context: vscode.ExtensionContext
): CodeAnalyzer[] {
  const analyzers: CodeAnalyzer[] = [
    new ComplexityAnalyzer(),
    new NamingAnalyzer(),
    new DuplicateCodeAnalyzer(),
    new SolidPrinciplesAnalyzer(),
    new AntiPatternAnalyzer(),
    // More analyzers will be added in the future
  ];

  return analyzers;
}
