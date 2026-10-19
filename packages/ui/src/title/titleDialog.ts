/**
 * The "Diagram title…" dialog of the Model group. Guide §5.4 keeps form fields out of the menu and
 * puts no title field next to it, so the title is edited here: one field, Cancel and Apply. Enter
 * applies, Escape cancels. An unchanged title writes nothing, so the history gets no empty step,
 * and a blank one cannot be applied, because the exports name their files after the title.
 */

import {
  createChromeDialog,
  element,
  type ChromeDialog,
  type DialogChrome,
} from "../dialog/chromeDialog";

const DIALOG_CLASS = "tt-title-dialog";
const TITLE_ID = "tt-title-dialog-title";
const FIELD_ID = "tt-title-dialog-field";

/** The diagram's title, read when the dialog opens and written when it applies. */
export interface DiagramTitle {
  title(): string;
  setTitle(title: string): void;
}

export type TitleDialog = ChromeDialog;

function button(label: string, primary: boolean): HTMLButtonElement {
  const created = element("button", primary ? "tt-btn tt-btn--primary" : "tt-btn", label);
  created.type = primary ? "submit" : "button";
  return created;
}

export function createTitleDialog(chrome: DialogChrome, diagramTitle: DiagramTitle): TitleDialog {
  const field = element("input", "tt-field__control");
  field.id = FIELD_ID;
  field.type = "text";
  field.autocomplete = "off";
  field.spellcheck = false;
  field.enterKeyHint = "done";
  // showModal() focuses the first focusable element, which would be the header's Close button.
  field.autofocus = true;
  const apply = button("Apply", true);
  const syncApply = (): void => {
    apply.disabled = field.value.trim() === "";
  };
  field.addEventListener("input", syncApply);

  return createChromeDialog(chrome, {
    className: DIALOG_CLASS,
    titleId: TITLE_ID,
    title: "Diagram title",
    beforeOpen() {
      field.value = diagramTitle.title();
      syncApply();
    },
    afterOpen() {
      field.select();
    },
    content(close) {
      const form = element("form", "tt-dialog__form");
      form.noValidate = true;
      const body = element("div", "tt-dialog__body");
      const label = element("label", "tt-field");
      const caption = element("span", "tt-field__label", "Title");
      label.htmlFor = FIELD_ID;
      label.append(caption, field);
      body.append(label);
      const footer = element("div", "tt-dialog__footer");
      const cancel = button("Cancel", false);
      cancel.addEventListener("click", close);
      footer.append(cancel, apply);
      form.append(body, footer);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const title = field.value.trim();
        if (title === "") return;
        close();
        if (title !== diagramTitle.title()) diagramTitle.setTitle(title);
      });
      return [form];
    },
  });
}
