/** A small modal explaining the notation and keyboard shortcuts. */

import { useEffect, useRef } from "react";
import { useUiStore } from "./uiStore";

const SHORTCUTS: Array<[string, string]> = [
  ["Double-click team", "Rename"],
  ["Drag between teams", "Create interaction (selected mode)"],
  ["⌘/Ctrl + Z", "Undo"],
  ["⇧⌘/Ctrl + Z, ⌘/Ctrl + Y", "Redo"],
  ["Delete / Backspace", "Remove selection"],
  ["Drag corner of team", "Resize (cognitive load)"],
];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function HelpDialog() {
  const open = useUiStore((s) => s.helpOpen);
  const setHelp = useUiStore((s) => s.setHelp);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setHelp(false);
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, setHelp]);

  if (!open) return null;

  return (
    <div className="tt-modal" role="dialog" aria-modal="true" aria-label="Help">
      <div className="tt-modal__backdrop" onClick={() => setHelp(false)} />
      <div className="tt-modal__panel" ref={panelRef}>
        <header className="tt-modal__header">
          <h2>How to model with Team Topologies</h2>
          <button
            type="button"
            className="tt-legend__close"
            onClick={() => setHelp(false)}
            aria-label="Close"
            ref={closeRef}
          >
            ×
          </button>
        </header>

        <div className="tt-modal__body">
          <p>
            Model your organisation as <strong>four team types</strong> connected
            by <strong>three interaction modes</strong>. Team shapes are solid
            (long-lived); interactions are dashed and translucent (short-lived).
            Place teams left-to-right along the flow of change, and size a team to
            hint at its cognitive load.
          </p>

          <h3>Shortcuts</h3>
          <table className="tt-shortcuts">
            <tbody>
              {SHORTCUTS.map(([keys, action]) => (
                <tr key={keys}>
                  <td>
                    <kbd>{keys}</kbd>
                  </td>
                  <td>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="tt-modal__foot">
            Your work autosaves locally. Use <strong>Share</strong> for a
            self-contained link, or <strong>JSON</strong> for a lossless,
            version-controllable file.
          </p>
        </div>
      </div>
    </div>
  );
}
