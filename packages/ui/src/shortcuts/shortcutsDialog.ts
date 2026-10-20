/**
 * The "Keyboard shortcuts…" dialog of the Help group (guide §5.4, §8): one table per group, the
 * action on the left and its keys as the chrome tooltip's chips on the right.
 */

import type { ShellHandle } from "@miragon/modeler-shell";
import {
  createChromeDialog,
  element,
  type ChromeDialog,
  type DialogChrome,
} from "../dialog/chromeDialog";
import { keyboardShortcuts, type ShortcutGroup, type ShortcutOptions } from "./shortcuts";

const DIALOG_CLASS = "tt-shortcuts";
const TITLE_ID = "tt-shortcuts-title";

/** What the dialog needs of the chrome around the diagram; a modeler-shell handle fits. */
export type ShortcutsChrome = DialogChrome & Pick<ShellHandle, "platform" | "lang">;

export type ShortcutsDialog = ChromeDialog;

function shortcutTable(group: ShortcutGroup, index: number): HTMLElement {
  const section = element("section", `${DIALOG_CLASS}__group`);
  const headingId = `${TITLE_ID}-group-${index}`;
  const heading = element("h3", `${DIALOG_CLASS}__group-title`, group.title);
  heading.id = headingId;
  const table = element("table", `${DIALOG_CLASS}__table`);
  table.setAttribute("aria-labelledby", headingId);
  const body = table.createTBody();
  for (const row of group.rows) {
    const line = body.insertRow();
    const action = element("th", `${DIALOG_CLASS}__action`, row.action);
    action.scope = "row";
    const keys = element("td", `${DIALOG_CLASS}__keys`);
    for (const key of row.keys) keys.append(element("kbd", `${DIALOG_CLASS}__key`, key));
    line.append(action, keys);
  }
  section.append(heading, table);
  return section;
}

export function createShortcutsDialog(
  chrome: ShortcutsChrome,
  options: ShortcutOptions = {},
): ShortcutsDialog {
  return createChromeDialog(chrome, {
    className: DIALOG_CLASS,
    titleId: TITLE_ID,
    title: "Keyboard shortcuts",
    content() {
      const body = element("div", `tt-dialog__body ${DIALOG_CLASS}__body`);
      body.append(
        ...keyboardShortcuts(chrome.platform, chrome.messages, chrome.lang, options).map(
          shortcutTable,
        ),
      );
      return [body];
    },
  });
}
