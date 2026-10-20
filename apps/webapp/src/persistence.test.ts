import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";
import {
  autosave,
  loadFromStorage,
  loadPrevious,
  readLegendOpen,
  saveToStorage,
  writeLegendOpen,
} from "./persistence";

const OWN_DIAGRAM: TtDocument = { ...SAMPLE_DOCUMENT, title: "Own diagram" };
const SHARED_DIAGRAM: TtDocument = { ...SAMPLE_DOCUMENT, title: "Shared diagram" };

function storedTitle(key: string): string | undefined {
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as { title: string }).title : undefined;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("the autosave", () => {
  it("restores what it saved, under the key earlier versions used", () => {
    expect(loadFromStorage()).toEqual({ status: "absent" });
    expect(saveToStorage(SAMPLE_DOCUMENT)).toBe("saved");
    expect(window.localStorage.getItem("tt-modeler:document:v1")).not.toBeNull();

    const restored = loadFromStorage();
    expect(restored.status).toBe("ok");
    if (restored.status === "ok") {
      expect(serializeDocument(restored.document)).toBe(serializeDocument(SAMPLE_DOCUMENT));
    }
  });

  it("reports a damaged copy instead of an absent one", () => {
    window.localStorage.setItem("tt-modeler:document:v1", "{ not json");
    expect(loadFromStorage().status).toBe("corrupt");
  });

  it("tells a full storage apart from one that refuses for other reasons", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    setItem.mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(saveToStorage(SAMPLE_DOCUMENT)).toBe("full");
    setItem.mockImplementationOnce(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    expect(saveToStorage(SAMPLE_DOCUMENT)).toBe("unavailable");
  });
});

describe("the previous diagram", () => {
  it("receives the stored diagram of another document before the autosave writes over it", () => {
    saveToStorage(OWN_DIAGRAM);

    expect(autosave(SHARED_DIAGRAM, false)).toEqual({ outcome: "saved", keptPrevious: true });

    expect(storedTitle("tt-modeler:document:v1")).toBe("Shared diagram");
    const previous = loadPrevious();
    expect(previous.status === "ok" && previous.document.title).toBe("Own diagram");
  });

  it("is left alone while the autosave follows the same document", () => {
    saveToStorage(OWN_DIAGRAM);

    expect(autosave({ ...OWN_DIAGRAM, title: "Own, renamed" }, true)).toEqual({
      outcome: "saved",
      keptPrevious: false,
    });
    expect(loadPrevious()).toEqual({ status: "absent" });
  });

  it("keeps no empty or identical stored diagram", () => {
    saveToStorage(emptyDocument("Draft"));
    expect(autosave(SHARED_DIAGRAM, false).keptPrevious).toBe(false);
    expect(autosave(SHARED_DIAGRAM, false).keptPrevious).toBe(false);
    expect(loadPrevious()).toEqual({ status: "absent" });
  });

  it("writes nothing when the storage has no room for the copy", () => {
    saveToStorage(OWN_DIAGRAM);
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(autosave(SHARED_DIAGRAM, false)).toEqual({ outcome: "full", keptPrevious: false });
    expect(storedTitle("tt-modeler:document:v1")).toBe("Own diagram");
  });

  it("reads the copy 0.10 kept for Restore previous diagram", () => {
    window.localStorage.setItem(
      "tt-modeler:document:v1:previous",
      serializeDocument(OWN_DIAGRAM, false),
    );
    const previous = loadPrevious();
    expect(previous.status === "ok" && previous.document.title).toBe("Own diagram");
  });
});

describe("the legend's state", () => {
  it("is undefined until the visitor chose, then what they chose", () => {
    expect(readLegendOpen()).toBeUndefined();
    writeLegendOpen(false);
    expect(readLegendOpen()).toBe(false);
    writeLegendOpen(true);
    expect(readLegendOpen()).toBe(true);
  });

  it("ignores a value it did not write", () => {
    window.localStorage.setItem("tt-modeler:legend-open", "maybe");
    expect(readLegendOpen()).toBeUndefined();
  });
});
