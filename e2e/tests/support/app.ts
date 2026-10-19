import { readFileSync } from "node:fs";
import LZString from "lz-string";
import type { ShellHandle } from "@miragon/modeler-shell";
import type { DiagramJsConnection } from "@miragon/modeler-shell/diagram-js";

/**
 * The web app's parts (apps/webapp/src/main.ts), published on window once its first diagram is in
 * place. Described structurally, so the suite never imports the renderer.
 */
export interface TtApp {
  readonly ready: boolean;
  readonly shell: ShellHandle;
  readonly connection: DiagramJsConnection;
  destroy(): void;
}

declare global {
  interface Window {
    __ttApp?: TtApp;
  }
}

/** The repository's example diagram (the VS Code walkthrough's sample.tt), as file text. */
export const SAMPLE_TEXT = readFileSync(
  new URL("../../../example/sample.tt", import.meta.url),
  "utf8",
);

export interface TtDocumentJson {
  title: string;
  nodes: Array<{ id: string; label: string }>;
  annotations: Array<{
    id: string;
    text: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    attachedTo?: string;
  }>;
  [key: string]: unknown;
}

export function sampleDocument(): TtDocumentJson {
  return JSON.parse(SAMPLE_TEXT) as TtDocumentJson;
}

function orphan(id: string, text: string, x: number): TtDocumentJson["annotations"][number] {
  const size = { width: 200, height: 64 };
  return { id, text, position: { x, y: 760 }, size, attachedTo: "team_gone" };
}

/**
 * The sample with two annotations whose element is gone: the importer drops their connectors and
 * reports a warning on each, which the problems list shows and selects.
 */
export function documentWithWarnings(): TtDocumentJson {
  const doc = sampleDocument();
  doc.annotations.push(
    orphan("ann_orphan_1", "Who owns this?", 40),
    orphan("ann_orphan_2", "Planned split", 300),
  );
  return doc;
}

/** The app's share link (`#d=`, LZ-compressed JSON) for a document. */
export function diagramLink(doc: object): string {
  return `/#d=${LZString.compressToEncodedURIComponent(JSON.stringify(doc))}`;
}
