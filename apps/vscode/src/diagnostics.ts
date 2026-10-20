import * as vscode from "vscode";
import { documentProblems } from "./problems.js";

export const DIAGNOSTIC_COLLECTION_NAME = "team-topologies";

interface TextPositions {
  positionAt(offset: number): vscode.Position;
}

/** The document's problems as VS Code diagnostics, located in `positions` (the text document). */
export function documentDiagnostics(text: string, positions: TextPositions): vscode.Diagnostic[] {
  return documentProblems(text).map((problem) => {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(
        positions.positionAt(problem.offset),
        positions.positionAt(problem.offset + problem.length),
      ),
      problem.message,
      problem.severity === "error"
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning,
    );
    diagnostic.source = DIAGNOSTIC_COLLECTION_NAME;
    return diagnostic;
  });
}

/** The pill's summary: how many problems, how many of them errors. */
export function problemCounts(diagnostics: readonly vscode.Diagnostic[]): {
  count: number;
  errors: number;
} {
  return {
    count: diagnostics.length,
    errors: diagnostics.filter(
      (diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Error,
    ).length,
  };
}
