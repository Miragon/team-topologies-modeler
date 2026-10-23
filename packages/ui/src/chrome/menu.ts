/**
 * The diagram's entries of the chrome menu (guide §5.4), the same in every host: the Model group
 * ("Diagram title…" where the host renames the diagram; the legend checkbox comes from the modeler
 * shell), the Export group (PNG first, the more frequent target, then SVG, then further formats)
 * and Help.
 */

import type { MenuGroups } from "@miragon/modeler-shell";
import { JSON_EXPORT_LABEL } from "../shortcuts/shortcuts";

export interface DiagramMenuActions {
  /** Opens the "Diagram title…" dialog; without it the Model group has no entry of its own. */
  editTitle?: (() => void) | undefined;
  exportPng(): void;
  exportSvg(): void;
  /** Only where the file is not the document already (the web app). */
  exportJson?: (() => void) | undefined;
  /** The chip of an app key that runs the JSON export, e.g. "⌘S". */
  exportJsonShortcut?: string | undefined;
  showKeyboardShortcuts(): void;
  /**
   * The key that opens the shortcuts dialog, where the host binds one ("?"): the entry's chip,
   * announced as its `aria-keyshortcuts`.
   */
  keyboardShortcutsKey?: string | undefined;
}

export function diagramMenu(actions: DiagramMenuActions): MenuGroups {
  const editTitle = actions.editTitle;
  return {
    ...(editTitle
      ? {
          model: [
            {
              kind: "dialog" as const,
              id: "diagram-title",
              label: "Diagram title…",
              onSelect: () => editTitle(),
            },
          ],
        }
      : {}),
    export: [
      {
        kind: "action",
        id: "export-png",
        label: "Export as PNG",
        icon: "file-image",
        onSelect: () => actions.exportPng(),
      },
      {
        kind: "action",
        id: "export-svg",
        label: "Export as SVG",
        icon: "file-code-corner",
        onSelect: () => actions.exportSvg(),
      },
      ...(actions.exportJson
        ? [
            {
              kind: "action" as const,
              id: "export-json",
              label: JSON_EXPORT_LABEL,
              shortcut: actions.exportJsonShortcut,
              onSelect: () => actions.exportJson?.(),
            },
          ]
        : []),
    ],
    help: [
      {
        kind: "dialog",
        id: "keyboard-shortcuts",
        label: "Keyboard shortcuts…",
        icon: "keyboard",
        shortcut: actions.keyboardShortcutsKey,
        onSelect: () => actions.showKeyboardShortcuts(),
      },
    ],
  };
}
