/**
 * Top-left floating menu (Excalidraw style): a single button that opens a
 * dropdown with the diagram title plus every file / history / export action.
 * Sharing lives in its own button at the top-right (see ShareButton).
 */

import { useEffect, useRef, useState } from "react";
import { SAMPLE_DOCUMENT, emptyDocument } from "@miragon/team-topologies-schema-model";
import { exportJson, importJsonFile } from "@/io/json";
import { downloadPng, downloadSvg } from "@/io/image";
import { useModeler } from "@/state/modelerContext";
import { CommitInput } from "./CommitInput";
import { useUiStore } from "./uiStore";
import { toast } from "./toast";

export function Menu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { modeler, title, setTitle, canUndo, canRedo } = useModeler();

  const toggleLegend = useUiStore((s) => s.toggleLegend);
  const legendOpen = useUiStore((s) => s.legendOpen);
  const toggleHelp = useUiStore((s) => s.toggleHelp);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  const onPickFile = () => fileInput.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = await importJsonFile(file);
    if (result.ok) {
      modeler.importDocument(result.document);
      toast("Diagram imported", "success");
    } else {
      toast(`Import failed: ${result.error}`, "error");
    }
  };

  const onExportImage = (format: "png" | "svg") => {
    try {
      const { svg } = modeler.saveSVG();
      if (format === "png") void downloadPng(svg, title);
      else downloadSvg(svg, title);
      toast(`Exported ${format.toUpperCase()}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    }
  };

  const onExportJson = () => {
    try {
      exportJson(modeler.exportDocument());
      toast("Exported JSON", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    }
  };

  return (
    <div className="tt-menu" ref={rootRef}>
      <button
        type="button"
        className="tt-iconbtn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Menu"
      >
        <span className="tt-iconbtn__glyph" aria-hidden>
          ☰
        </span>
        <span>Menu</span>
      </button>

      {open && (
        <div className="tt-menu__dropdown" role="menu">
          <label className="tt-menu__title">
            <span className="tt-menu__title-label">Diagram title</span>
            <CommitInput
              value={title}
              ariaLabel="Diagram title"
              onCommit={setTitle}
              placeholder="Untitled team topology"
            />
          </label>

          <div className="tt-menu__sep" />

          <button
            type="button"
            className="tt-menu__item"
            role="menuitem"
            onClick={run(() => {
              modeler.importDocument(emptyDocument());
              toast("New diagram", "info");
            })}
          >
            <span className="tt-menu__glyph" aria-hidden>
              ＋
            </span>{" "}
            New diagram
          </button>
          <button
            type="button"
            className="tt-menu__item"
            role="menuitem"
            onClick={run(() => {
              modeler.importDocument(SAMPLE_DOCUMENT);
              toast("Loaded example diagram", "info");
            })}
          >
            <span className="tt-menu__glyph" aria-hidden>
              ◇
            </span>{" "}
            Show example
          </button>
          <button type="button" className="tt-menu__item" role="menuitem" onClick={run(onPickFile)}>
            <span className="tt-menu__glyph" aria-hidden>
              ↥
            </span>{" "}
            Import…
          </button>

          <div className="tt-menu__sep" />

          <button
            type="button"
            className="tt-menu__item"
            role="menuitem"
            disabled={!canUndo}
            onClick={run(() => modeler.undo())}
          >
            <span className="tt-menu__glyph" aria-hidden>
              ↺
            </span>{" "}
            Undo
            <kbd className="tt-menu__kbd">⌘Z</kbd>
          </button>
          <button
            type="button"
            className="tt-menu__item"
            role="menuitem"
            disabled={!canRedo}
            onClick={run(() => modeler.redo())}
          >
            <span className="tt-menu__glyph" aria-hidden>
              ↻
            </span>{" "}
            Redo
            <kbd className="tt-menu__kbd">⇧⌘Z</kbd>
          </button>

          <div className="tt-menu__sep" />

          <button
            type="button"
            className={"tt-menu__item" + (legendOpen ? " is-active" : "")}
            role="menuitemcheckbox"
            aria-checked={legendOpen}
            onClick={run(toggleLegend)}
          >
            <span className="tt-menu__glyph" aria-hidden>
              ▤
            </span>{" "}
            Legend
          </button>

          <div className="tt-menu__sep" />

          <button
            type="button"
            className="tt-menu__item"
            role="menuitem"
            onClick={run(onExportJson)}
          >
            <span className="tt-menu__glyph" aria-hidden>
              {"{}"}
            </span>{" "}
            Export · JSON
          </button>
          <button
            type="button"
            className="tt-menu__item"
            role="menuitem"
            onClick={run(() => onExportImage("png"))}
          >
            <span className="tt-menu__glyph" aria-hidden>
              ▦
            </span>{" "}
            Export · PNG
          </button>
          <button
            type="button"
            className="tt-menu__item"
            role="menuitem"
            onClick={run(() => onExportImage("svg"))}
          >
            <span className="tt-menu__glyph" aria-hidden>
              ⬡
            </span>{" "}
            Export · SVG
          </button>

          <div className="tt-menu__sep" />

          <button type="button" className="tt-menu__item" role="menuitem" onClick={run(toggleHelp)}>
            <span className="tt-menu__glyph" aria-hidden>
              ?
            </span>{" "}
            Help & shortcuts
          </button>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={onFileChange}
      />
    </div>
  );
}
