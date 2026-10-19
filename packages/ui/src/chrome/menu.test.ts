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

  it('puts "Diagram title…" into the Model group where the host renames the diagram', () => {
    const editTitle = vi.fn();
    const menu = diagramMenu({
      editTitle,
      exportPng: vi.fn(),
      exportSvg: vi.fn(),
      showKeyboardShortcuts: vi.fn(),
    });
    const [entry] = menu.model ?? [];
    expect(entry).toMatchObject({ kind: "dialog", id: "diagram-title", label: "Diagram title…" });
    expect(entry && "keepEnabledWhenReadOnly" in entry).toBe(false);
    if (entry?.kind === "dialog") entry.onSelect();
    expect(editTitle).toHaveBeenCalledOnce();
  });

  it("announces the host's key for the shortcuts dialog without a chip after its …", () => {
    const menu = diagramMenu({
      exportPng: vi.fn(),
      exportSvg: vi.fn(),
      showKeyboardShortcuts: vi.fn(),
      keyboardShortcutsKey: "?",
    });
    const [help] = menu.help ?? [];
    expect(help).toMatchObject({ kind: "dialog", ariaKeyShortcuts: "?" });
    expect(help && "shortcut" in help && help.shortcut).toBeFalsy();
  });
});
