import { describe, expect, it, vi } from "vitest";
import { diagramMenu } from "./menu";

describe("diagramMenu", () => {
  it("offers PNG before SVG, and JSON only where the host exports it", () => {
    const actions = { exportPng: vi.fn(), exportSvg: vi.fn(), showKeyboardShortcuts: vi.fn() };
    expect(diagramMenu(actions).export?.map((entry) => entry.id)).toEqual([
      "export-png",
      "export-svg",
    ]);
    const withJson = diagramMenu({ ...actions, exportJson: vi.fn(), exportJsonShortcut: "⌘S" });
    expect(withJson.export?.map((entry) => entry.id)).toEqual([
      "export-png",
      "export-svg",
      "export-json",
    ]);
  });

  it("has no Model entries of its own and a shortcuts dialog under Help", () => {
    const showKeyboardShortcuts = vi.fn();
    const menu = diagramMenu({ exportPng: vi.fn(), exportSvg: vi.fn(), showKeyboardShortcuts });
    expect(menu.model).toBeUndefined();
    const [help] = menu.help ?? [];
    expect(help).toMatchObject({ kind: "dialog", label: "Keyboard shortcuts…", icon: "keyboard" });
    if (help?.kind === "dialog") help.onSelect();
    expect(showKeyboardShortcuts).toHaveBeenCalledOnce();
  });
});
