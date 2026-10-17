import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDocument } from "@miragon/team-topologies-schema-model";
import { downloadPng, downloadSvg } from "@/io/image";
import { dismissToast, useToastStore } from "@/ui/toast";
import { exportImageWithFeedback, exportJsonWithFeedback, useExportStore } from "./exports";

vi.mock("@/io/image", () => ({ downloadPng: vi.fn(), downloadSvg: vi.fn() }));
vi.mock("@/io/json", () => ({ exportJson: vi.fn() }));

const host = {
  exportDocument: () => emptyDocument(),
  saveSVG: () => ({ svg: "<svg/>" }),
};

const visibleToasts = () =>
  useToastStore
    .getState()
    .toasts.filter((toast) => !toast.leaving)
    .map(({ message, tone }) => ({ message, tone }));

describe("export actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
    useExportStore.setState({ busy: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(downloadPng).mockReset();
    vi.mocked(downloadSvg).mockReset();
  });

  it("reports a PNG as exported only after it is written", async () => {
    let finish: () => void = () => undefined;
    vi.mocked(downloadPng).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const pending = exportImageWithFeedback(host, "png", "Diagram");
    expect(useExportStore.getState().busy).toBe("png");
    expect(visibleToasts()).toEqual([]);

    finish();
    await pending;
    expect(visibleToasts()).toEqual([{ message: "PNG exported", tone: "success" }]);
    expect(useExportStore.getState().busy).toBeNull();
  });

  it("shows progress for a slow PNG and turns it into the result", async () => {
    let finish: () => void = () => undefined;
    vi.mocked(downloadPng).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const pending = exportImageWithFeedback(host, "png", "Diagram");
    await vi.advanceTimersByTimeAsync(400);
    expect(visibleToasts()).toEqual([{ message: "Exporting PNG…", tone: "info" }]);

    finish();
    await pending;
    expect(visibleToasts()).toEqual([{ message: "PNG exported", tone: "success" }]);
  });

  it("still reports the result when the progress toast was dismissed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let fail: (error: Error) => void = () => undefined;
    vi.mocked(downloadPng).mockReturnValue(new Promise<void>((_, reject) => (fail = reject)));

    const pending = exportImageWithFeedback(host, "png", "Diagram");
    await vi.advanceTimersByTimeAsync(400);
    dismissToast(useToastStore.getState().toasts[0]!.id);
    await vi.advanceTimersByTimeAsync(300);

    fail(new Error("Could not rasterise the diagram"));
    await pending;
    await vi.advanceTimersByTimeAsync(300);
    expect(visibleToasts()).toEqual([
      { message: "Couldn't create the PNG. Try again, or export as SVG.", tone: "error" },
    ]);
  });

  it("turns a failed PNG into an error toast instead of a false success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(downloadPng).mockRejectedValue(new Error("Could not rasterise the diagram"));

    await exportImageWithFeedback(host, "png", "Diagram");
    expect(visibleToasts()).toEqual([
      { message: "Couldn't create the PNG. Try again, or export as SVG.", tone: "error" },
    ]);
    expect(useExportStore.getState().busy).toBeNull();
  });

  it("ignores a second PNG export while one is running", async () => {
    let finish: () => void = () => undefined;
    vi.mocked(downloadPng).mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    const first = exportImageWithFeedback(host, "png", "Diagram");
    await exportImageWithFeedback(host, "png", "Diagram");
    finish();
    await first;
    expect(downloadPng).toHaveBeenCalledTimes(1);
  });

  it("exports SVG and JSON with a success toast", async () => {
    await exportImageWithFeedback(host, "svg", "Diagram");
    exportJsonWithFeedback(host);
    expect(downloadSvg).toHaveBeenCalledWith("<svg/>", "Diagram");
    expect(visibleToasts()).toEqual([
      { message: "SVG exported", tone: "success" },
      { message: "JSON exported", tone: "success" },
    ]);
  });
});
