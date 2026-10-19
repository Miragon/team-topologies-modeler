import type { ProblemItem } from "@miragon/modeler-shell";
import type { ImportWarning } from "@miragon/team-topologies-renderer";

/** What the problems list needs of an element the diagram still has. */
export interface ProblemElement {
  readonly label?: string | undefined;
}

/**
 * Import warnings as rows of the problems list (guide §5.10): the message, below it the element's
 * label, and the element a click on the row selects where the diagram still has it.
 */
export function problemItems(
  warnings: readonly ImportWarning[],
  element: (id: string) => ProblemElement | undefined,
): ProblemItem[] {
  return warnings.map((warning) => {
    const found = warning.elementId ? element(warning.elementId) : undefined;
    const label = found?.label?.trim();
    return {
      severity: "warning",
      message: warning.message,
      ...(label ? { location: `“${label}”` } : {}),
      ...(found && warning.elementId ? { elementId: warning.elementId } : {}),
    };
  });
}

/**
 * The import's warnings that still hold: one whose element an edit has removed since goes with it,
 * so the pill never counts a problem the diagram no longer has.
 */
export function remainingWarnings(
  warnings: readonly ImportWarning[],
  locatedAtImport: ReadonlySet<string>,
  exists: (id: string) => boolean,
): ImportWarning[] {
  return warnings.filter(
    ({ elementId }) => !elementId || !locatedAtImport.has(elementId) || exists(elementId),
  );
}

/** The toast after an import with warnings points at the pill (guide §9). */
export function importWarningsText(count: number, pillLabel: string): string {
  const warnings = count === 1 ? "1 warning" : `${count} warnings`;
  return `Imported with ${warnings}. Details under “${pillLabel}” bottom left.`;
}
