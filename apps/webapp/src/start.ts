/**
 * What the web app opens on a visit: the diagram of a shared link, else the browser's autosave,
 * else the start screen on an empty diagram (guide §8).
 */

import { emptyDocument, type TtDocument } from "@miragon/team-topologies-schema-model";
import { isEmptyDocument, isSameDocument } from "./documents";
import type { HashDocumentResult } from "./io/url";
import type { StoredDocumentResult } from "./persistence";

export interface StartPlan {
  document: TtDocument;
  /** A fresh start: the start screen fronts the empty canvas. */
  startScreen: boolean;
  /** The diagram came from a link, an import the visitor started: its warnings get a toast. */
  announce: boolean;
  /**
   * The browser's own diagram that a different shared diagram displaces. It opens first, so the
   * shared one replaces it with an undo offer, and stays in storage until the shared one is edited.
   */
  displaced: TtDocument | null;
  sharedLinkProblem: string | null;
  autosaveProblem: string | null;
}

export function planStart(hash: HashDocumentResult, autosave: StoredDocumentResult): StartPlan {
  const shared = hash.status === "ok" ? hash.document : null;
  const saved = autosave.status === "ok" ? autosave.document : null;
  const displaced =
    shared && saved && !isEmptyDocument(saved) && !isSameDocument(saved, shared) ? saved : null;
  const document = shared ?? saved ?? emptyDocument();

  return {
    document,
    startScreen: isEmptyDocument(document) && !displaced,
    announce: shared !== null,
    displaced,
    sharedLinkProblem: hash.status === "invalid" ? hash.detail : null,
    autosaveProblem: autosave.status === "corrupt" ? autosave.detail : null,
  };
}
