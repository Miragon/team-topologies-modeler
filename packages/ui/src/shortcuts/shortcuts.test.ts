import { describe, expect, it } from "vitest";
import { defaultMessages } from "@miragon/modeler-shell/core";
import { keyboardShortcuts } from "./shortcuts";

describe("keyboardShortcuts", () => {
  it("names the View keys like the chrome's tooltips, per platform", () => {
    const [mac] = keyboardShortcuts("mac", defaultMessages, "en");
    const [other] = keyboardShortcuts("other", defaultMessages, "en");
    expect(mac).toEqual({
      title: "View",
      rows: [
        { action: "Zoom in", keys: ["⌘+"] },
        { action: "Zoom out", keys: ["⌘−"] },
        { action: "Zoom to 100%", keys: ["⌘0"] },
        { action: "Fit to view", keys: ["⇧1"] },
      ],
    });
    expect(other?.rows.map((row) => row.keys[0])).toEqual([
      "Ctrl+Plus",
      "Ctrl+Minus",
      "Ctrl+0",
      "Shift+1",
    ]);
  });

  it("lists View, Edit and Tools, and the web app's File keys first when asked", () => {
    expect(keyboardShortcuts("other", defaultMessages, "en").map((group) => group.title)).toEqual([
      "View",
      "Edit",
      "Tools",
    ]);
    const web = keyboardShortcuts("mac", defaultMessages, "en", { fileKeys: true });
    expect(web.map((group) => group.title)).toEqual(["File", "View", "Edit", "Tools"]);
  });

  it("names the File rows as the menu does and lists the web app's dialog key under View", () => {
    const [file, view] = keyboardShortcuts(
      "other",
      { ...defaultMessages, openFile: "Öffnen…" },
      "en",
      { fileKeys: true },
    );
    expect(file?.rows).toEqual([
      { action: "Öffnen…", keys: ["Ctrl+O"] },
      { action: "Export as JSON", keys: ["Ctrl+S"] },
    ]);
    expect(view?.rows.at(-1)).toEqual({ action: "Keyboard shortcuts", keys: ["?"] });
    const [ide] = keyboardShortcuts("other", defaultMessages, "en");
    expect(ide?.rows.some((row) => row.keys.includes("?"))).toBe(false);
  });
});
