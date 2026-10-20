/**
 * What is wrong with a document text, located in the text, for the Problems view (guide §13.5):
 * errors where the text is no valid diagram (the webview then shows the last valid one, locked),
 * warnings where it opens but loses something (a connector to an element that does not exist).
 * Pure, so the extension host and the tests share it.
 */

import {
  findNodeAtLocation,
  parseTree,
  printParseErrorCode,
  type Node,
  type ParseError,
} from "jsonc-parser";
import {
  parseDocument,
  type DocumentIssue,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";

export interface DocumentProblem {
  severity: "error" | "warning";
  message: string;
  /** Where in the text, as a character offset and length. */
  offset: number;
  length: number;
}

/** jsonc-parser's error names (its codes are a const enum, unreadable under isolatedModules). */
const SYNTAX_ERRORS: Readonly<Record<string, string>> = {
  InvalidSymbol: "unexpected character",
  InvalidNumberFormat: "invalid number",
  PropertyNameExpected: "expected a property name in double quotes",
  ValueExpected: "expected a value",
  ColonExpected: "expected a colon",
  CommaExpected: "expected a comma",
  CloseBraceExpected: "expected a closing brace",
  CloseBracketExpected: "expected a closing bracket",
  EndOfFileExpected: "expected the end of the file",
  InvalidCommentToken: "comments are not allowed",
  UnexpectedEndOfComment: "comments are not allowed",
  UnexpectedEndOfString: "unterminated string",
  UnexpectedEndOfNumber: "unterminated number",
  InvalidUnicode: "invalid Unicode escape",
  InvalidEscapeCharacter: "invalid escape character",
  InvalidCharacter: "invalid character in a string",
};

function syntaxProblem({ error, offset, length }: ParseError): DocumentProblem {
  return {
    severity: "error",
    message: `Not valid JSON: ${SYNTAX_ERRORS[printParseErrorCode(error)] ?? "unexpected input"}.`,
    offset,
    length: Math.max(length, 1),
  };
}

const NO_VALUE: DocumentProblem = {
  severity: "error",
  message: "Not valid JSON: expected a value.",
  offset: 0,
  length: 1,
};

/** The value at `path`, or the closest object or array above it when the value is missing. */
function located(tree: Node, path: (string | number)[]): { offset: number; length: number } {
  for (let depth = path.length; depth >= 0; depth -= 1) {
    const node = findNodeAtLocation(tree, path.slice(0, depth));
    if (!node) continue;
    // A missing field points at the object that lacks it: its opening brace, not the whole block.
    if (depth < path.length && (node.type === "object" || node.type === "array")) {
      return { offset: node.offset, length: 1 };
    }
    return { offset: node.offset, length: Math.max(node.length, 1) };
  }
  return { offset: 0, length: 1 };
}

function pathLabel(path: (string | number)[]): string {
  return path.reduce<string>(
    (label, key) =>
      typeof key === "number" ? `${label}[${key}]` : label ? `${label}.${key}` : key,
    "",
  );
}

function issueProblem(tree: Node, issue: DocumentIssue): DocumentProblem {
  const where = pathLabel(issue.path);
  return {
    severity: "error",
    message: where ? `${where}: ${issue.message}` : issue.message,
    ...located(tree, issue.path),
  };
}

/** Connectors the diagram drops on open, as the renderer's importer warns about them. */
function attachmentWarnings(document: TtDocument, tree: Node): DocumentProblem[] {
  const elementIds = new Set(
    [...document.nodes, ...document.interactions, ...document.flows].map((element) => element.id),
  );
  const annotationIds = new Set(document.annotations.map((annotation) => annotation.id));
  return document.annotations.flatMap((annotation, index) => {
    const target = annotation.attachedTo;
    if (target === undefined || elementIds.has(target)) return [];
    const reason = annotationIds.has(target)
      ? `is attached to the annotation "${target}"; an annotation attaches only to a team, an interaction or a flow, so its connector is dropped.`
      : `is attached to "${target}", which is not in the diagram, so its connector is dropped.`;
    return [
      {
        severity: "warning" as const,
        message: `Annotation "${annotation.id}" ${reason}`,
        ...located(tree, ["annotations", index, "attachedTo"]),
      },
    ];
  });
}

export function documentProblems(text: string): DocumentProblem[] {
  // A blank file is a new, empty diagram (the webview reads it the same way).
  if (text.trim() === "") return [];
  const errors: ParseError[] = [];
  const tree = parseTree(text, errors, { disallowComments: true, allowTrailingComma: false });
  if (errors.length > 0) return errors.map(syntaxProblem);
  if (!tree) return [NO_VALUE];
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [{ severity: "error", message: `Not valid JSON: ${reason}`, offset: 0, length: 1 }];
  }
  const result = parseDocument(value);
  if (!result.ok) return result.issues.map((issue) => issueProblem(tree, issue));
  return attachmentWarnings(result.document, tree);
}
