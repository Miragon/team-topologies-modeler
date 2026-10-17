/**
 * The one dialog shell (guide §8): dimmed, blurred backdrop, centred panel with a titled header and
 * a close button, optional right-aligned footer. Escape and a backdrop click close it, Tab stays
 * inside, and focus goes back to where it was when the dialog opened. Mount it only while open.
 */

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { Icon } from "@miragon/team-topologies-ui";
import { focusMenuTrigger } from "./uiStore";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
  /** "alertdialog" for confirmations: the body then also serves as the accessible description. */
  role?: "dialog" | "alertdialog";
  /** Receives focus on open; defaults to the first focusable control. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

function focusablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  size = "md",
  role = "dialog",
  initialFocusRef,
}: ModalProps) {
  const titleId = useId();
  const bodyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  // A ref, so a StrictMode re-run of the effect keeps the real opener instead of the dialog's own
  // first button, which it has focused by then.
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    openerRef.current ??= document.activeElement;
    (initialFocusRef?.current ?? focusablesIn(panel)[0] ?? panel).focus();

    // Capture phase, so Escape closes only the dialog and never reaches the canvas shortcuts.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = focusablesIn(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    // Toasts stay reachable: they are live regions on top of the dialog, not background content.
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target || panel.contains(target)) return;
      if (target instanceof Element && target.closest(".tt-toaster")) return;
      (focusablesIn(panel)[0] ?? panel).focus();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      const opener = openerRef.current;
      if (!opener || opener === document.body) return;
      // The canvas <svg> is an SVGElement, and it opens Help (?) and drop confirmations.
      const focusable = opener instanceof HTMLElement || opener instanceof SVGElement;
      if (focusable && opener.isConnected) opener.focus();
      else focusMenuTrigger();
    };
    // The dialog captures its opener once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panelClass = size === "sm" ? "tt-modal__panel tt-modal__panel--sm" : "tt-modal__panel";

  return (
    <div className="tt-modal">
      <div className="tt-modal__backdrop" aria-hidden="true" onClick={() => onClose()} />
      <div
        ref={panelRef}
        className={panelClass}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={role === "alertdialog" ? bodyId : undefined}
        tabIndex={-1}
      >
        <header className="tt-modal__header">
          <h2 id={titleId} className="tt-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="tt-closebtn"
            aria-label="Close"
            title="Close"
            onClick={() => onClose()}
          >
            <Icon icon={X} />
          </button>
        </header>
        <div id={bodyId} className="tt-modal__body">
          {children}
        </div>
        {footer ? <div className="tt-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
