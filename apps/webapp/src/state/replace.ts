/**
 * The one way to replace the diagram on the canvas (guide §9 "Destruktiv"). New, Show example,
 * Open, a dropped file and Restore all go through `replaceDocument`: a non-empty diagram is only
 * replaced after the user confirms, and it is kept as the previous diagram, so "Restore previous
 * diagram" can bring it back.
 */

import { serializeDocument, type TtDocument } from "@miragon/team-topologies-schema-model";
import type { ImportWarning, Modeler } from "@miragon/team-topologies-renderer";
import { importJsonFile, isAcceptedFileName, type FileImportFailure } from "@/io/json";
import { toast } from "@/ui/toast";
import { useUiStore, type ConfirmRequest } from "@/ui/uiStore";
import { clearBackup, hasStorage, loadBackup, saveBackup } from "./persistence";

/** The subset of the modeler the replace flows need, so they can be tested without a canvas. */
export type DocumentHost = Pick<Modeler, "exportDocument" | "importDocument">;

export type Replacement =
  { kind: "new" } | { kind: "example" } | { kind: "file"; fileName: string } | { kind: "restore" };

export type ReplaceOutcome = { replaced: false } | { replaced: true; warningCount: number };

export function isEmptyDocument(doc: TtDocument): boolean {
  return (
    doc.nodes.length === 0 &&
    doc.interactions.length === 0 &&
    doc.flows.length === 0 &&
    doc.annotations.length === 0
  );
}

export function isSameDocument(first: TtDocument, second: TtDocument): boolean {
  return serializeDocument(first, false) === serializeDocument(second, false);
}

function quoted(text: string): string {
  return `“${text}”`;
}

function displayTitle(doc: TtDocument): string {
  return doc.title.trim() || "Untitled team topology";
}

function replacementName(replacement: Replacement): string {
  switch (replacement.kind) {
    case "new":
      return "A new, empty diagram";
    case "example":
      return "The example diagram";
    case "file":
      return quoted(replacement.fileName);
    case "restore":
      return "The previous diagram";
  }
}

function confirmCopy(
  replacement: Replacement,
  current: TtDocument,
  next: TtDocument,
  canKeepPrevious: boolean,
): ConfirmRequest {
  const currentName = quoted(displayTitle(current));

  if (replacement.kind === "restore") {
    const message =
      displayTitle(current) === displayTitle(next)
        ? "The previous diagram replaces the current one. The current one becomes the previous diagram, so you can switch back at any time."
        : `${quoted(displayTitle(next))} replaces ${currentName}. ${currentName} becomes the previous diagram, so you can switch back at any time.`;
    return {
      title: "Restore the previous diagram?",
      message,
      confirmLabel: "Restore",
      tone: "primary",
    };
  }

  const recovery = canKeepPrevious
    ? "You can restore it from the menu until you replace the diagram again."
    : "This can't be undone, so export it as JSON first if you want to keep it.";
  return {
    title: "Replace the current diagram?",
    message: `${replacementName(replacement)} replaces ${currentName}. ${recovery}`,
    confirmLabel: "Replace",
    tone: "destructive",
  };
}

function reportImportWarnings(warnings: readonly ImportWarning[]): void {
  if (warnings.length === 0) return;
  for (const warning of warnings) console.warn("[tt-modeler] Import warning:", warning.message);
  const count = warnings.length;
  toast(
    `Imported with ${count} ${count === 1 ? "warning" : "warnings"}. Details in the console.`,
    "warning",
  );
}

/** Imports a document and surfaces the importer's warnings instead of dropping them. */
export function importWithFeedback(host: DocumentHost, doc: TtDocument): number {
  const { warnings } = host.importDocument(doc);
  reportImportWarnings(warnings);
  return warnings.length;
}

function backupFailedCopy(replacement: Replacement, current: TtDocument): ConfirmRequest {
  const currentName = quoted(displayTitle(current));
  const restore = replacement.kind === "restore";
  return {
    title: restore ? "Restore without keeping a copy?" : "Replace without keeping a copy?",
    message: `There's no room left in this browser's storage to keep ${currentName}, so it can't be restored afterwards. Cancel and export it as JSON first if you want to keep it.`,
    confirmLabel: restore ? "Restore anyway" : "Replace anyway",
    tone: "destructive",
  };
}

/** Puts the backup slot back the way it was before a replace that didn't go through. */
function restoreBackupSlot(previousBackup: TtDocument | null): void {
  if (previousBackup) saveBackup(previousBackup);
  else clearBackup();
}

export async function replaceDocument(
  host: DocumentHost,
  next: TtDocument,
  replacement: Replacement,
): Promise<ReplaceOutcome> {
  const current = host.exportDocument();
  const needsConfirmation = !isEmptyDocument(current) && !isSameDocument(current, next);
  const canKeepPrevious = hasStorage();

  if (needsConfirmation) {
    const confirmed = await useUiStore
      .getState()
      .requestConfirm(confirmCopy(replacement, current, next, canKeepPrevious));
    if (!confirmed) return { replaced: false };
  }

  // The copy is written before the canvas changes: the dialog promised a restore, and a full
  // storage must not turn that promise into a lost diagram.
  const replaced = host.exportDocument();
  const previousBackup = needsConfirmation ? loadBackup() : null;
  const keptPrevious = needsConfirmation && canKeepPrevious && saveBackup(replaced);
  if (needsConfirmation && canKeepPrevious && !keptPrevious) {
    const replaceAnyway = await useUiStore
      .getState()
      .requestConfirm(backupFailedCopy(replacement, replaced));
    if (!replaceAnyway) return { replaced: false };
  }

  let warningCount: number;
  try {
    warningCount = importWithFeedback(host, next);
  } catch (error) {
    console.error("[tt-modeler] Could not display the diagram:", error);
    if (keptPrevious) restoreBackupSlot(previousBackup);
    host.importDocument(replaced);
    toast(
      "Couldn't display this diagram, so your current one stays. Details in the console.",
      "error",
    );
    return { replaced: false };
  }

  if (keptPrevious) {
    useUiStore.getState().setBackupAvailable(true);
  } else if (replacement.kind === "restore" && isEmptyDocument(replaced)) {
    clearBackup();
    useUiStore.getState().setBackupAvailable(false);
  }
  useUiStore.getState().dismissWelcome();
  return { replaced: true, warningCount };
}

export async function restorePreviousDiagram(host: DocumentHost): Promise<ReplaceOutcome> {
  const previous = loadBackup();
  if (!previous) {
    useUiStore.getState().setBackupAvailable(false);
    toast(
      "The previous diagram is no longer stored in this browser, so it can't be restored.",
      "error",
    );
    return { replaced: false };
  }
  return replaceDocument(host, previous, { kind: "restore" });
}

function fileErrorMessage(reason: FileImportFailure, fileName: string): string {
  const name = quoted(fileName);
  switch (reason) {
    case "unreadable":
      return `Couldn't read ${name}. Check that the file contains a valid diagram.`;
    case "not-a-diagram":
      return `${name} doesn't contain a Team Topologies diagram. Choose a .tt or .ttm.json file.`;
    case "invalid":
      return `Couldn't open ${name} because the diagram in it is invalid. Details in the console.`;
  }
}

/** Shared by the file picker and drag & drop, so both validate, confirm and report alike. */
export async function openDocumentFile(host: DocumentHost, file: File): Promise<ReplaceOutcome> {
  if (!isAcceptedFileName(file.name)) {
    toast(`Can't open ${quoted(file.name)}. Choose a .tt or .ttm.json file.`, "error");
    return { replaced: false };
  }

  const result = await importJsonFile(file);
  if (!result.ok) {
    console.warn(`[tt-modeler] Could not open "${file.name}":`, result.detail);
    toast(fileErrorMessage(result.reason, file.name), "error");
    return { replaced: false };
  }

  const outcome = await replaceDocument(host, result.document, {
    kind: "file",
    fileName: file.name,
  });
  if (outcome.replaced && outcome.warningCount === 0) {
    toast(`Opened ${quoted(file.name)}`, "success");
  }
  return outcome;
}
