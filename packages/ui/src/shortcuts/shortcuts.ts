/**
 * Every keyboard shortcut of the diagram, in the groups of guide §5.4 (View, Edit, the notation's
 * tools). The View group uses the chrome's own labels, so the dialog, the tooltips and the zoom
 * panel always agree.
 */

import {
  formatPercent,
  shortcutLabel,
  type Platform,
  type ShellMessages,
} from "@miragon/modeler-shell/core";

export interface ShortcutRow {
  readonly action: string;
  /** Alternative key combinations, each shown as its own chip. */
  readonly keys: readonly string[];
}

export interface ShortcutGroup {
  readonly title: string;
  readonly rows: readonly ShortcutRow[];
}

export interface ShortcutOptions {
  /** The web app's own keys: Open…, Export as JSON and "?" for this dialog. */
  fileKeys?: boolean | undefined;
}

/** The label of the Export group's JSON entry, which the File keys' row repeats. */
export const JSON_EXPORT_LABEL = "Export as JSON";
/** The key the web app binds to this dialog. */
export const SHORTCUTS_DIALOG_KEY = "?";

const ARROWS = ["←", "↑", "→", "↓"] as const;

function platformKeys(platform: Platform, keyNames: ShellMessages["keyNames"]) {
  if (platform === "mac") {
    return {
      undo: ["⌘Z"],
      redo: ["⌘⇧Z"],
      selectAll: ["⌘A"],
      copy: ["⌘C"],
      paste: ["⌘V"],
      remove: ["⌫"],
      coarseMove: ARROWS.map((arrow) => `⇧${arrow}`),
      shiftDrag: ["⇧ Drag"],
      shiftClick: ["⇧ Click"],
      newLine: ["⇧Enter"],
      open: ["⌘O"],
      save: ["⌘S"],
    };
  }
  const { ctrl, shift } = keyNames;
  return {
    undo: [`${ctrl}+Z`],
    redo: [`${ctrl}+${shift}+Z`, `${ctrl}+Y`],
    selectAll: [`${ctrl}+A`],
    copy: [`${ctrl}+C`],
    paste: [`${ctrl}+V`],
    remove: ["Del", "Backspace"],
    coarseMove: ARROWS.map((arrow) => `${shift}+${arrow}`),
    shiftDrag: [`${shift}+Drag`],
    shiftClick: [`${shift}+Click`],
    newLine: [`${shift}+Enter`],
    open: [`${ctrl}+O`],
    save: [`${ctrl}+S`],
  };
}

export function keyboardShortcuts(
  platform: Platform,
  messages: ShellMessages,
  lang: string,
  options: ShortcutOptions = {},
): ShortcutGroup[] {
  const view = (key: Parameters<typeof shortcutLabel>[0]) => [
    shortcutLabel(key, platform, messages.keyNames),
  ];
  const keys = platformKeys(platform, messages.keyNames);
  const groups: ShortcutGroup[] = [
    {
      title: "View",
      rows: [
        { action: messages.zoomIn, keys: view("zoomIn") },
        { action: messages.zoomOut, keys: view("zoomOut") },
        { action: messages.zoomToActual(formatPercent(1, lang)), keys: view("zoomToActual") },
        { action: messages.fit, keys: view("fit") },
        ...(options.fileKeys
          ? [{ action: "Keyboard shortcuts", keys: [SHORTCUTS_DIALOG_KEY] }]
          : []),
      ],
    },
    {
      title: "Edit",
      rows: [
        { action: "Undo", keys: keys.undo },
        { action: "Redo", keys: keys.redo },
        { action: "Select all", keys: keys.selectAll },
        { action: "Copy", keys: keys.copy },
        { action: "Paste", keys: keys.paste },
        { action: "Delete", keys: keys.remove },
        { action: "Move selection", keys: ARROWS },
        { action: "Move selection in large steps", keys: keys.coarseMove },
        { action: "Clear the selection", keys: ["Esc"] },
      ],
    },
    {
      title: "Tools",
      rows: [
        { action: "Select several elements", keys: keys.shiftDrag },
        { action: "Add to or remove from the selection", keys: keys.shiftClick },
        { action: "Add the palette element in the middle", keys: ["Enter", "Space"] },
        { action: "Edit a name or text", keys: ["Double-click"] },
        { action: "Save the text", keys: ["Enter"] },
        { action: "Start a new line", keys: keys.newLine },
        { action: "Discard the change", keys: ["Esc"] },
      ],
    },
  ];
  if (options.fileKeys) {
    groups.unshift({
      title: "File",
      rows: [
        { action: messages.openFile, keys: keys.open },
        { action: JSON_EXPORT_LABEL, keys: keys.save },
      ],
    });
  }
  return groups;
}
