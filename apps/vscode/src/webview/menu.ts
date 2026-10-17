/**
 * Top-left menu button with its dropdown, following the WAI-ARIA menu-button pattern: opening
 * focuses the first item (ArrowUp on the button: the last), ArrowUp/ArrowDown wrap through the
 * items, Home/End jump, and Escape, Tab or choosing an item close it and return focus to the button.
 */

import { ICON_MENU, iconMarkup, type IconNode } from "@miragon/team-topologies-renderer";
import { ICON_CHECK } from "./icons.js";

export interface MenuAction {
  label: string;
  icon: IconNode;
  onSelect: () => void;
  /**
   * Set for an on/off entry. The menu doesn't own that state, so the host reports each change
   * through `MenuHandle.setChecked`.
   */
  checked?: boolean;
}

export type MenuEntry = MenuAction | "separator";

export interface MenuHandle {
  focusTrigger(): void;
  setChecked(entry: MenuAction, checked: boolean): void;
}

const MENU_ID = "tt-menu";

function showChecked(item: HTMLButtonElement, checked: boolean): void {
  item.setAttribute("aria-checked", String(checked));
}

export function mountMenu(host: HTMLElement, entries: readonly MenuEntry[]): MenuHandle {
  const root = document.createElement("div");
  root.className = "menu";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "chrome-btn menu-btn";
  trigger.title = "Menu";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-controls", MENU_ID);
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `${iconMarkup(ICON_MENU)}<span class="chrome-btn__label">Menu</span>`;

  const dropdown = document.createElement("div");
  dropdown.id = MENU_ID;
  dropdown.className = "menu-dropdown";
  dropdown.setAttribute("role", "menu");
  dropdown.setAttribute("aria-label", "Menu");
  dropdown.hidden = true;

  const items: HTMLButtonElement[] = [];
  const checkboxItems = new Map<MenuAction, HTMLButtonElement>();
  for (const entry of entries) {
    if (entry === "separator") {
      const separator = document.createElement("div");
      separator.className = "menu-sep";
      separator.setAttribute("role", "separator");
      dropdown.append(separator);
      continue;
    }
    const item = document.createElement("button");
    item.type = "button";
    item.className = "menu-item";
    item.tabIndex = -1;
    item.innerHTML = iconMarkup(entry.icon, { className: "menu-item__icon" });
    const label = document.createElement("span");
    label.className = "menu-item__label";
    label.textContent = entry.label;
    item.append(label);
    if (entry.checked === undefined) {
      item.setAttribute("role", "menuitem");
    } else {
      item.setAttribute("role", "menuitemcheckbox");
      item.insertAdjacentHTML(
        "beforeend",
        iconMarkup(ICON_CHECK, { className: "menu-item__check" }),
      );
      showChecked(item, entry.checked);
      checkboxItems.set(entry, item);
    }
    // Focus goes back to the button before the action runs, so whatever the action opens
    // (the host's save dialog) hands focus back to a visible control afterwards.
    item.addEventListener("click", () => {
      closeMenu({ restoreFocus: true });
      entry.onSelect();
    });
    items.push(item);
    dropdown.append(item);
  }

  root.append(trigger, dropdown);
  host.append(root);

  const isOpen = (): boolean => !dropdown.hidden;

  function openMenu(focus: "first" | "last"): void {
    dropdown.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    (focus === "last" ? items[items.length - 1] : items[0])?.focus();
  }

  function closeMenu({ restoreFocus }: { restoreFocus: boolean }): void {
    if (!isOpen()) return;
    dropdown.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }

  function focusItemAt(index: number): void {
    items[(index + items.length) % items.length]?.focus();
  }

  trigger.addEventListener("click", () => {
    if (isOpen()) closeMenu({ restoreFocus: false });
    else openMenu("first");
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    openMenu(event.key === "ArrowUp" ? "last" : "first");
  });

  dropdown.addEventListener("keydown", (event) => {
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case "ArrowDown":
        focusItemAt(current + 1);
        break;
      case "ArrowUp":
        focusItemAt(current < 0 ? items.length - 1 : current - 1);
        break;
      case "Home":
        focusItemAt(0);
        break;
      case "End":
        focusItemAt(items.length - 1);
        break;
      case "Escape":
      case "Tab":
        closeMenu({ restoreFocus: true });
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  });

  // Capture phase: diagram-js handles pointer events on the canvas before they would bubble here.
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (isOpen() && !root.contains(event.target as Node | null)) {
        closeMenu({ restoreFocus: false });
      }
    },
    true,
  );

  // Escape while focus sits outside the menu (e.g. on the canvas) closes it without moving focus.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      closeMenu({ restoreFocus: dropdown.contains(document.activeElement) });
    }
  });

  return {
    focusTrigger: () => trigger.focus(),
    setChecked(entry, checked) {
      const item = checkboxItems.get(entry);
      if (item) showChecked(item, checked);
    },
  };
}
