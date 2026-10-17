/**
 * Export actions with user feedback, shared by the menu and the keyboard shortcuts. Every export
 * ends in a toast: success once the file is handed to the browser, an error toast otherwise.
 */

import { create } from "zustand";
import type { Modeler } from "@miragon/team-topologies-renderer";
import { exportJson } from "@/io/json";
import { downloadPng, downloadSvg } from "@/io/image";
import { toast, updateToast } from "@/ui/toast";

export type ImageFormat = "png" | "svg";

type ExportHost = Pick<Modeler, "exportDocument" | "saveSVG">;

/** Short exports finish before this; only slower ones get a progress toast, so nothing flickers. */
const PROGRESS_TOAST_DELAY_MS = 300;

interface ExportState {
  /** The image format being rasterised right now, so the menu can show it as busy. */
  busy: ImageFormat | null;
}

export const useExportStore = create<ExportState>(() => ({ busy: null }));

export function exportJsonWithFeedback(host: ExportHost): void {
  try {
    exportJson(host.exportDocument());
    toast("JSON exported", "success");
  } catch (error) {
    console.error("[tt-modeler] JSON export failed:", error);
    toast("Couldn't export the JSON file. Try again.", "error");
  }
}

function exportSvg(host: ExportHost, title: string): void {
  try {
    downloadSvg(host.saveSVG().svg, title);
    toast("SVG exported", "success");
  } catch (error) {
    console.error("[tt-modeler] SVG export failed:", error);
    toast("Couldn't export the SVG. Try again, or export as JSON.", "error");
  }
}

async function exportPng(host: ExportHost, title: string): Promise<void> {
  if (useExportStore.getState().busy) return;
  useExportStore.setState({ busy: "png" });

  let progressToast: number | undefined;
  const progressTimer = setTimeout(() => {
    progressToast = toast("Exporting PNG…", "info", { sticky: true });
  }, PROGRESS_TOAST_DELAY_MS);
  const report = (message: string, tone: "success" | "error") => {
    clearTimeout(progressTimer);
    if (progressToast === undefined || !updateToast(progressToast, message, tone)) {
      toast(message, tone);
    }
  };

  try {
    await downloadPng(host.saveSVG().svg, title);
    report("PNG exported", "success");
  } catch (error) {
    console.error("[tt-modeler] PNG export failed:", error);
    report("Couldn't create the PNG. Try again, or export as SVG.", "error");
  } finally {
    useExportStore.setState({ busy: null });
  }
}

export function exportImageWithFeedback(
  host: ExportHost,
  format: ImageFormat,
  title: string,
): Promise<void> {
  if (format === "png") return exportPng(host, title);
  exportSvg(host, title);
  return Promise.resolve();
}
