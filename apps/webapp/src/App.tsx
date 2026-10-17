/**
 * Application shell. A full-bleed diagram-js canvas (with the renderer's own top-centre palette)
 * and floating chrome layered on top: menu and diagram title (top-left), Share (top-right), the
 * selection inspector (right), zoom (bottom-right), the legend above the legal notice
 * (bottom-left) and toasts (bottom-centre). On a fresh start the welcome card replaces the working
 * chrome; only the legal notice stays.
 */

import { useEffect } from "react";
import { Inspector, Legend } from "@miragon/team-topologies-ui";
import { ModelerProvider } from "@/state/modeler";
import { useModeler } from "@/state/modelerContext";
import { exportJsonWithFeedback } from "@/state/exports";
import { openDocumentFile } from "@/state/replace";
import { FILE_PICKER_ACCEPT } from "@/io/json";
import { DiagramCanvas } from "@/ui/DiagramCanvas";
import { EmptyState } from "@/ui/EmptyState";
import { Menu } from "@/ui/Menu";
import { TitleField } from "@/ui/TitleField";
import { ShareButton } from "@/ui/ShareButton";
import { ZoomControls } from "@/ui/ZoomControls";
import { LegalNotice } from "@/ui/LegalNotice";
import { HelpDialog } from "@/ui/HelpDialog";
import { ConfirmDialog } from "@/ui/ConfirmDialog";
import { DropZone } from "@/ui/DropZone";
import { Toaster } from "@/ui/Toaster";
import { focusMenuTrigger, isDialogOpen, useUiStore } from "@/ui/uiStore";

const FORM_FIELD_SELECTOR = "input, textarea, select, [contenteditable]";

function pickFile(onPicked: (file: File) => void): void {
  document.querySelector(".tt-file-shortcut")?.remove();
  const input = document.createElement("input");
  input.type = "file";
  input.accept = FILE_PICKER_ACCEPT;
  input.className = "tt-file-shortcut";
  input.hidden = true;
  const cleanUp = () => input.remove();
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    cleanUp();
    if (file) onPicked(file);
  });
  input.addEventListener("cancel", cleanUp);
  document.body.appendChild(input);
  input.click();
}

/**
 * Ctrl/Cmd+S saves the diagram as JSON and Ctrl/Cmd+O opens a file, instead of the browser's
 * "save page" and "open file" dialogs. Opening goes through the same replace gate as the menu.
 */
function useFileShortcuts() {
  const { modeler } = useModeler();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.shiftKey) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key !== "s" && key !== "o") return;
      event.preventDefault();
      if (isDialogOpen()) return;

      if (key === "o") {
        pickFile((file) => void openDocumentFile(modeler, file));
        return;
      }

      // A field commits its draft on blur, so the saved file includes what was just typed.
      const active = document.activeElement;
      const field = active instanceof HTMLElement && active.matches(FORM_FIELD_SELECTOR);
      if (field) active.blur();
      exportJsonWithFeedback(modeler);
      if (field && active.isConnected) active.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modeler]);
}

/**
 * The canvas keyboard only listens while the page or the canvas has focus. After a click on a
 * chrome button (Menu › Undo, zoom, Share) focus stays on that button, and undo/redo should still
 * work from there. Form fields keep their own text undo.
 */
function useChromeHistoryShortcuts() {
  const { modeler } = useModeler();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      const undo = key === "z" && !event.shiftKey;
      const redo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey);
      if (!undo && !redo) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target === document.body || target === document.documentElement) return;
      if (target.closest(`${FORM_FIELD_SELECTOR}, [role="menu"], .tt-canvas`)) return;
      if (isDialogOpen()) return;

      event.preventDefault();
      if (undo) modeler.undo();
      else modeler.redo();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [modeler]);
}

function AppShell() {
  const { modeler, selected, revision } = useModeler();
  const welcome = useUiStore((s) => s.welcome);
  const legendOpen = useUiStore((s) => s.legendOpen);
  const setLegend = useUiStore((s) => s.setLegend);
  const className = welcome === "dismissed" ? "tt-app" : "tt-app tt-app--welcome";
  useFileShortcuts();
  useChromeHistoryShortcuts();

  // DOM order is Tab order: the welcome card, then menu and title, the canvas with its palette,
  // and Share. With the card first, Tab after closing it starts at the menu. The stacking comes
  // from z-index, not from this order.
  return (
    <div className={className}>
      <EmptyState />
      <div className="tt-chrome tt-chrome--left">
        <Menu />
        <TitleField />
      </div>
      <DiagramCanvas inert={welcome !== "dismissed"} />
      <div className="tt-chrome tt-chrome--right">
        <ShareButton />
      </div>
      <Inspector modeler={modeler} selected={selected} revision={revision} />
      <ZoomControls />
      <Legend
        open={legendOpen}
        onClose={() => setLegend(false)}
        onRequestFocusReturn={focusMenuTrigger}
      />
      <LegalNotice />
      <DropZone />
      <HelpDialog />
      <ConfirmDialog />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ModelerProvider>
      <AppShell />
    </ModelerProvider>
  );
}
