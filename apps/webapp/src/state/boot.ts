/**
 * Resolves the first document (shared link → autosave → empty) and decides whether the welcome
 * card shows. A shared link that differs from the user's own autosave would overwrite it on the
 * first edit, so the own diagram is kept as the previous diagram first.
 */

import { emptyDocument, type TtDocument } from "@miragon/team-topologies-schema-model";
import {
  readDocumentFromLocation,
  writeDocumentToLocation,
  type HashDocumentResult,
} from "@/io/url";
import { toast } from "@/ui/toast";
import { useUiStore } from "@/ui/uiStore";
import { loadBackup, loadFromStorage, saveBackup, type StoredDocumentResult } from "./persistence";
import { importWithFeedback, isEmptyDocument, isSameDocument, type DocumentHost } from "./replace";

export interface BootPlan {
  document: TtDocument;
  /** Fresh start: nothing to show, so the welcome card fronts the empty canvas. */
  welcome: boolean;
  /** The user's own autosave, displaced by a shared link. */
  displacedOwnDiagram: TtDocument | null;
  sharedLinkProblem: string | null;
  autosaveProblem: string | null;
  /** A broken link stays in the address bar until the first edit, so it can still be inspected. */
  seedAddressBar: boolean;
}

export function planBoot(hash: HashDocumentResult, autosave: StoredDocumentResult): BootPlan {
  const shared = hash.status === "ok" ? hash.document : null;
  const saved = autosave.status === "ok" ? autosave.document : null;
  const displacedOwnDiagram =
    shared && saved && !isEmptyDocument(saved) && !isSameDocument(saved, shared) ? saved : null;
  const document = shared ?? saved ?? emptyDocument();

  return {
    document,
    welcome: isEmptyDocument(document) && !displacedOwnDiagram,
    displacedOwnDiagram,
    sharedLinkProblem: hash.status === "invalid" ? hash.detail : null,
    autosaveProblem: autosave.status === "corrupt" ? autosave.detail : null,
    seedAddressBar: hash.status !== "invalid" && !isEmptyDocument(document),
  };
}

export function bootModeler(host: DocumentHost): void {
  const plan = planBoot(readDocumentFromLocation(), loadFromStorage());
  const ui = useUiStore.getState();

  if (plan.sharedLinkProblem) {
    console.warn("[tt-modeler] Could not read the shared link:", plan.sharedLinkProblem);
    toast(
      "This shared link is incomplete or damaged, so its diagram couldn't be opened. Ask the sender for a new link.",
      "error",
    );
  }
  if (plan.autosaveProblem) {
    console.warn("[tt-modeler] Ignoring a damaged autosave:", plan.autosaveProblem);
    toast(
      "Your autosaved diagram was damaged and couldn't be restored. Details in the console.",
      "warning",
    );
  }

  const ownDiagram = plan.displacedOwnDiagram;
  const keptOwnDiagram = ownDiagram ? saveBackup(ownDiagram) : false;
  // The autosave follows whatever the canvas shows, so opening the shared diagram without a copy of
  // the own one would overwrite it.
  const sharedLinkBlocked = ownDiagram !== null && !keptOwnDiagram;
  const initialDocument = ownDiagram && !keptOwnDiagram ? ownDiagram : plan.document;
  if (sharedLinkBlocked) {
    toast(
      "The shared diagram wasn't opened, because this browser has no room left to keep a copy of yours. Export your diagram as JSON, then open the link again.",
      "error",
      { sticky: true },
    );
  }

  // A diagram the canvas can't display must not lock the app on every load, so fall back to an
  // empty canvas instead.
  let loaded = true;
  try {
    importWithFeedback(host, initialDocument);
  } catch (error) {
    loaded = false;
    console.error("[tt-modeler] Could not display the diagram:", error);
    toast(
      "Couldn't display the diagram, so you see an empty one. Details in the console.",
      "error",
    );
    host.importDocument(emptyDocument());
  }
  if (loaded && plan.seedAddressBar) writeDocumentToLocation(host.exportDocument());

  ui.setBackupAvailable(keptOwnDiagram || loadBackup() !== null);
  ui.resolveWelcome(loaded ? plan.welcome : !keptOwnDiagram);

  if (keptOwnDiagram) {
    toast(
      "You're viewing a shared diagram. To get your own back, choose Restore previous diagram in the menu.",
      "info",
      { duration: 5000 },
    );
  }
}
