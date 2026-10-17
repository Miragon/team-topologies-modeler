import { afterEach, describe, expect, it, vi } from "vitest";
import { ICON_MENU } from "@miragon/team-topologies-renderer";
import { mountMenu, type MenuAction } from "./menu.js";

afterEach(() => {
  document.body.replaceChildren();
});

function setup(checked: boolean) {
  const host = document.createElement("div");
  document.body.append(host);
  const toggle: MenuAction = { label: "Legend", icon: ICON_MENU, checked, onSelect: vi.fn() };
  const action: MenuAction = { label: "Export as SVG", icon: ICON_MENU, onSelect: vi.fn() };
  const menu = mountMenu(host, [toggle, "separator", action]);
  const trigger = host.querySelector<HTMLButtonElement>(".menu-btn")!;
  const item = (name: string) =>
    [...host.querySelectorAll<HTMLButtonElement>(".menu-item")].find(
      (button) => button.textContent === name,
    )!;
  return { menu, toggle, action, trigger, item };
}

describe("mountMenu", () => {
  it("renders an entry with `checked` as a menuitemcheckbox", () => {
    const { item } = setup(true);
    expect(item("Legend").getAttribute("role")).toBe("menuitemcheckbox");
    expect(item("Legend").getAttribute("aria-checked")).toBe("true");
    expect(item("Legend").querySelector(".menu-item__check")).not.toBeNull();
  });

  it("keeps plain entries as menuitems without a check mark", () => {
    const { item } = setup(false);
    expect(item("Export as SVG").getAttribute("role")).toBe("menuitem");
    expect(item("Export as SVG").hasAttribute("aria-checked")).toBe(false);
    expect(item("Export as SVG").querySelector(".menu-item__check")).toBeNull();
  });

  it("updates the checked state through the handle", () => {
    const { menu, toggle, item } = setup(false);
    menu.setChecked(toggle, true);
    expect(item("Legend").getAttribute("aria-checked")).toBe("true");
    menu.setChecked(toggle, false);
    expect(item("Legend").getAttribute("aria-checked")).toBe("false");
  });

  it("closes, returns focus to the button and runs the action on choice", () => {
    const { toggle, trigger, item } = setup(false);
    trigger.click();
    item("Legend").click();
    expect(toggle.onSelect).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("focuses the menu button on request", () => {
    const { menu, trigger } = setup(false);
    menu.focusTrigger();
    expect(document.activeElement).toBe(trigger);
  });
});
