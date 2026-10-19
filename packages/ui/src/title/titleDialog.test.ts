import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultMessages } from "@miragon/modeler-shell/core";
import { createTitleDialog, type DiagramTitle } from "./titleDialog";

// jsdom has no modal dialogs: open and close only toggle `open` and fire `close`, as browsers do.
const dialogMethods = {
  showModal(this: HTMLDialogElement) {
    this.open = true;
    this.querySelector<HTMLElement>("[autofocus]")?.focus();
  },
  close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event("close"));
  },
};

beforeEach(() => {
  for (const [name, method] of Object.entries(dialogMethods)) {
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      writable: true,
      value: method,
    });
  }
});

afterEach(() => {
  document.body.replaceChildren();
  for (const name of Object.keys(dialogMethods)) {
    Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

function chrome() {
  const root = document.createElement("div");
  const trigger = document.createElement("button");
  root.append(trigger);
  document.body.append(root);
  return { root, messages: defaultMessages, menu: { trigger } } as never as Parameters<
    typeof createTitleDialog
  >[0] & { menu: { trigger: HTMLButtonElement } };
}

function diagramTitle(initial: string): DiagramTitle & { setTitle: ReturnType<typeof vi.fn> } {
  let current = initial;
  return {
    title: () => current,
    setTitle: vi.fn((next: string) => {
      current = next;
    }),
  };
}

function parts(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>("dialog.tt-title-dialog")!;
  return {
    dialog,
    field: dialog.querySelector<HTMLInputElement>("input")!,
    form: dialog.querySelector<HTMLFormElement>("form")!,
    apply: [...dialog.querySelectorAll("button")].find((button) => button.textContent === "Apply")!,
    cancel: [...dialog.querySelectorAll("button")].find(
      (button) => button.textContent === "Cancel",
    )!,
  };
}

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("createTitleDialog", () => {
  it("opens on the current title, named by its heading, with the field focused", () => {
    const host = chrome();
    createTitleDialog(host, diagramTitle("Payments")).open();

    const { dialog, field } = parts(host.root);
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-labelledby")).toBe(dialog.querySelector("h2")?.id);
    expect(dialog.querySelector("h2")?.textContent).toBe("Diagram title");
    expect(field.value).toBe("Payments");
    expect(document.activeElement).toBe(field);
  });

  it("applies the trimmed title once and returns the focus to its opener", () => {
    const host = chrome();
    const title = diagramTitle("Payments");
    host.menu.trigger.focus();
    createTitleDialog(host, title).open();
    const { dialog, field, form } = parts(host.root);

    type(field, "  Checkout  ");
    form.requestSubmit();

    expect(title.setTitle).toHaveBeenCalledExactlyOnceWith("Checkout");
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(host.menu.trigger);
  });

  it("writes nothing for an unchanged title or on Cancel", () => {
    const host = chrome();
    const title = diagramTitle("Payments");
    const titleDialog = createTitleDialog(host, title);

    titleDialog.open();
    parts(host.root).form.requestSubmit();
    titleDialog.open();
    type(parts(host.root).field, "Other");
    parts(host.root).cancel.click();

    expect(title.setTitle).not.toHaveBeenCalled();
    expect(parts(host.root).dialog.open).toBe(false);
  });

  it("cannot apply a blank title", () => {
    const host = chrome();
    const title = diagramTitle("Payments");
    createTitleDialog(host, title).open();
    const { apply, dialog, field, form } = parts(host.root);

    type(field, "   ");
    expect(apply.disabled).toBe(true);
    form.requestSubmit();

    expect(title.setTitle).not.toHaveBeenCalled();
    expect(dialog.open).toBe(true);
  });

  it("is gone after destroy", () => {
    const host = chrome();
    const titleDialog = createTitleDialog(host, diagramTitle("Payments"));
    titleDialog.open();
    titleDialog.destroy();
    expect(host.root.querySelector("dialog")).toBeNull();
    expect(titleDialog.isOpen()).toBe(false);
  });
});
