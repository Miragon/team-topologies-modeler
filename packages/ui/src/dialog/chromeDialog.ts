/**
 * The modeler's own dialogs in a host's chrome (guide §8, "Modeler dialogs" of the modeler shell's
 * API): a native modal <dialog> in the chrome's root, so the browser keeps the focus inside it and
 * closes it on Escape, and its top layer puts it above every island. Built on the first open and
 * kept (closed) afterwards; `destroy()` removes it, because the chrome removes only what it added
 * itself.
 */

import { iconElement, type ShellHandle } from "@miragon/modeler-shell";

/** What a dialog needs of the chrome around the diagram; a modeler-shell handle fits. */
export type DialogChrome = Pick<ShellHandle, "root" | "messages" | "menu">;

export interface ChromeDialog {
  open(): void;
  isOpen(): boolean;
  close(): void;
  destroy(): void;
}

export interface ChromeDialogSpec {
  /** Class of the `<dialog>` next to `tt-dialog`, for the dialog's own rules. */
  readonly className: string;
  readonly titleId: string;
  readonly title: string;
  /** The parts below the header, built once on the first open. */
  content(close: () => void): Node[];
  /** Runs before every open, while the dialog is still closed. */
  beforeOpen?(): void;
  /** Runs after every open, once the dialog shows and holds the focus. */
  afterOpen?(): void;
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const created = document.createElement(tag);
  created.className = className;
  if (text !== undefined) created.textContent = text;
  return created;
}

function header(chrome: DialogChrome, spec: ChromeDialogSpec, onClose: () => void): HTMLElement {
  const head = element("header", "tt-dialog__header");
  const title = element("h2", "tt-dialog__title", spec.title);
  title.id = spec.titleId;
  const close = element("button", "tt-closebtn tt-dialog__close");
  close.type = "button";
  close.setAttribute("aria-label", chrome.messages.close);
  close.append(iconElement("x"));
  close.addEventListener("click", onClose);
  head.append(title, close);
  return head;
}

function canTakeFocus(target: Element | null): target is HTMLElement | SVGElement {
  if (!(target instanceof HTMLElement || target instanceof SVGElement)) return false;
  return target.isConnected && target !== target.ownerDocument.body;
}

export function createChromeDialog(chrome: DialogChrome, spec: ChromeDialogSpec): ChromeDialog {
  let dialog: HTMLDialogElement | undefined;
  let opener: Element | null = null;

  /** Back to the control that opened the dialog (the menu trigger after a menu entry). */
  function returnFocus(): void {
    const target = opener;
    opener = null;
    if (canTakeFocus(target)) {
      target.focus({ preventScroll: true });
      if (target.ownerDocument.activeElement === target) return;
    }
    if (!chrome.menu.trigger.hidden) chrome.menu.trigger.focus({ preventScroll: true });
  }

  function build(): HTMLDialogElement {
    const created = element("dialog", `tt-dialog ${spec.className}`);
    created.setAttribute("aria-labelledby", spec.titleId);
    const close = (): void => created.close();
    const panel = element("div", "tt-dialog__panel");
    panel.append(header(chrome, spec, close), ...spec.content(close));
    created.append(panel);
    // A click on the backdrop targets the <dialog> itself, but so does a text selection that
    // started in a field and ended outside the panel; only a press that began there closes it.
    let pressedOnBackdrop = false;
    created.addEventListener("pointerdown", (event) => {
      pressedOnBackdrop = event.target === created;
    });
    created.addEventListener("click", (event) => {
      if (event.target === created && pressedOnBackdrop) created.close();
      pressedOnBackdrop = false;
    });
    created.addEventListener("close", returnFocus);
    chrome.root.append(created);
    return created;
  }

  return {
    open() {
      dialog ??= build();
      if (dialog.open) return;
      opener = dialog.ownerDocument.activeElement;
      spec.beforeOpen?.();
      dialog.showModal();
      spec.afterOpen?.();
    },
    close() {
      dialog?.close();
    },
    isOpen: () => dialog?.open === true,
    destroy() {
      dialog?.remove();
      dialog = undefined;
      opener = null;
    },
  };
}
