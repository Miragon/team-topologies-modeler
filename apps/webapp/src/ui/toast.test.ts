import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dismissToast, toast, updateToast, useToastStore } from "./toast";

const visibleMessages = () =>
  useToastStore
    .getState()
    .toasts.filter((item) => !item.leaving)
    .map((item) => item.message);

describe("toasts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows at most three toasts and lets the oldest go", () => {
    for (const message of ["one", "two", "three", "four"]) toast(message);
    expect(visibleMessages()).toEqual(["two", "three", "four"]);
  });

  it("never pushes a sticky toast out", () => {
    toast("Storage is full", "error", { sticky: true });
    for (const message of ["one", "two", "three"]) toast(message, "success");
    vi.advanceTimersByTime(300);

    expect(visibleMessages()).toEqual(["Storage is full", "two", "three"]);
    expect(useToastStore.getState().toasts.map((item) => item.message)).toContain(
      "Storage is full",
    );
  });

  it("merges identical messages", () => {
    toast("Link copied", "success");
    toast("Link copied", "success");
    expect(visibleMessages()).toEqual(["Link copied"]);
  });

  it("closes errors later than other tones and keeps sticky toasts", () => {
    toast("Saved", "success");
    toast("Couldn't save", "error");
    toast("Storage is full", "error", { sticky: true });

    vi.advanceTimersByTime(2800 + 300);
    expect(visibleMessages()).toEqual(["Couldn't save", "Storage is full"]);

    vi.advanceTimersByTime(5000);
    expect(visibleMessages()).toEqual(["Storage is full"]);
  });

  it("refuses to update a toast that is gone or leaving", () => {
    const id = toast("Exporting PNG…", "info", { sticky: true });
    expect(updateToast(id, "PNG exported", "success")).toBe(true);

    dismissToast(id);
    expect(updateToast(id, "Couldn't create the PNG.", "error")).toBe(false);
    vi.advanceTimersByTime(300);
    expect(useToastStore.getState().toasts).toEqual([]);
  });
});
