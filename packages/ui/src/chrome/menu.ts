/**
 * The diagram's entries of the chrome menu (guide §5.4), the same in every host: the Export group
 * (PNG first, the more frequent target, then SVG, then further formats) and Help. The Model group
 * holds only the legend checkbox, which the modeler shell adds itself.
 */

import type { MenuGroups } from "@miragon/modeler-shell";

export interface DiagramMenuActions {
  exportPng(): void;
  exportSvg(): void;
  /** Only where the file is not the document already (the web app). */
  exportJson?: (() => void) | undefined;
  /** The chip of an app key that runs the JSON export, e.g. "⌘S". */
  exportJsonShortcut?: string | undefined;
  showKeyboardShortcuts(): void;
  /** The chip of the key that opens the shortcuts dialog, where the host binds one ("?"). */
  keyboardShortcutsKey?: string | undefined;
}

export function diagramMenu(actions: DiagramMenuActions): MenuGroups {
  return {
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
              label: "Export as JSON",
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
