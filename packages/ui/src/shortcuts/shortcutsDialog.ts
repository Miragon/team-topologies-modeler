/**
 * The "Keyboard shortcuts…" dialog of the Help group (guide §5.4, §8), a native modal <dialog> in
 * the chrome's root: the browser keeps the focus inside it and closes it on Escape, and its top
 * layer puts it above every island. Built on the first open and kept (closed) afterwards;
 * `destroy()` removes it, because the chrome removes only what it added itself.
 */

import { iconElement, type ShellHandle } from "@miragon/modeler-shell";
import { keyboardShortcuts, type ShortcutGroup, type ShortcutOptions } from "./shortcuts";

const DIALOG_CLASS = "tt-shortcuts";
const TITLE_ID = "tt-shortcuts-title";

/** What the dialog needs of the chrome around the diagram; a modeler-shell handle fits. */
export type ShortcutsChrome = Pick<ShellHandle, "root" | "platform" | "lang" | "messages" | "menu">;

export interface ShortcutsDialog {
  open(): void;
  isOpen(): boolean;
  close(): void;
  destroy(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const created = document.createElement(tag);
  created.className = className;
  if (text !== undefined) created.textContent = text;
  return created;
}

function shortcutTable(group: ShortcutGroup, index: number): HTMLElement {
  const section = element("section", `${DIALOG_CLASS}__group`);
  const headingId = `${TITLE_ID}-group-${index}`;
  const heading = element("h4", `${DIALOG_CLASS}__group-title`, group.title);
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

function dialogContent(
  chrome: ShortcutsChrome,
  options: ShortcutOptions,
  onClose: () => void,
): HTMLElement {
  const panel = element("div", `${DIALOG_CLASS}__panel`);
  const header = element("header", `${DIALOG_CLASS}__header`);
  const title = element("h3", `${DIALOG_CLASS}__title`, "Keyboard shortcuts");
  title.id = TITLE_ID;
  const close = element("button", `tt-closebtn ${DIALOG_CLASS}__close`);
  close.type = "button";
  close.setAttribute("aria-label", chrome.messages.close);
  close.append(iconElement("x"));
  close.addEventListener("click", onClose);
  header.append(title, close);

  const body = element("div", `${DIALOG_CLASS}__body`);
  body.append(
    ...keyboardShortcuts(chrome.platform, chrome.messages, chrome.lang, options).map(shortcutTable),
  );
  panel.append(header, body);
  return panel;
}

export function createShortcutsDialog(
  chrome: ShortcutsChrome,
  options: ShortcutOptions = {},
): ShortcutsDialog {
  let dialog: HTMLDialogElement | undefined;

  function build(): HTMLDialogElement {
    const created = element("dialog", DIALOG_CLASS);
    created.setAttribute("aria-labelledby", TITLE_ID);
    created.append(dialogContent(chrome, options, () => created.close()));
    // A click on the backdrop targets the <dialog> itself; the panel covers all of its own box.
    created.addEventListener("click", (event) => {
      if (event.target === created) created.close();
    });
    created.addEventListener("close", () => {
      if (!chrome.menu.trigger.hidden) chrome.menu.trigger.focus({ preventScroll: true });
    });
    chrome.root.append(created);
    return created;
  }

  return {
    open() {
      dialog ??= build();
      if (!dialog.open) dialog.showModal();
    },
    close() {
      dialog?.close();
    },
    isOpen: () => dialog?.open === true,
    destroy() {
      dialog?.remove();
      dialog = undefined;
    },
  };
}
