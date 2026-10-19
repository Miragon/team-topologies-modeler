import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_DOCUMENT, serializeDocument } from "@miragon/team-topologies-schema-model";
import { loadFromStorage, readLegendOpen, saveToStorage, writeLegendOpen } from "./persistence";

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
