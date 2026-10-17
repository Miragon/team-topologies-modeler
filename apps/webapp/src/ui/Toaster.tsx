/** Renders the active toast notifications, bottom-centre. */

import { Check, CircleX, Info, TriangleAlert, X } from "lucide-react";
import { Icon, type IconComponent } from "@miragon/team-topologies-ui";
import { useToastStore, type ToastTone } from "./toast";

const TONE_ICON: Record<ToastTone, IconComponent> = {
  info: Info,
  success: Check,
  warning: TriangleAlert,
  error: CircleX,
};

// The dismissed toast unmounts, so keyboard focus moves on instead of falling back to <body>.
function moveFocusAfterDismiss(closeButton: HTMLElement): void {
  const toaster = closeButton.closest(".tt-toaster");
  const otherClose = Array.from(
    toaster?.querySelectorAll<HTMLElement>(".tt-toast:not(.is-leaving) .tt-toast__close") ?? [],
  ).find((candidate) => candidate !== closeButton);
  const target = otherClose ?? document.querySelector<HTMLElement>(".tt-canvas svg");
  target?.focus();
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const pause = useToastStore((state) => state.pause);
  const resume = useToastStore((state) => state.resume);

  const resumeUnlessEngaged = (id: number, element: HTMLElement) => {
    if (element.matches(":hover") || element.contains(document.activeElement)) return;
    resume(id);
  };

  return (
    <div className="tt-toaster" role="status" aria-live="polite">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`tt-toast tt-toast--${item.tone}${item.leaving ? " is-leaving" : ""}`}
          onMouseEnter={() => pause(item.id)}
          onMouseLeave={(event) => resumeUnlessEngaged(item.id, event.currentTarget)}
          onFocus={() => pause(item.id)}
          onBlur={(event) => {
            const toastElement = event.currentTarget;
            requestAnimationFrame(() => resumeUnlessEngaged(item.id, toastElement));
          }}
        >
          <Icon icon={TONE_ICON[item.tone]} className="tt-toast__icon" />
          <span className="tt-toast__message">{item.message}</span>
          <button
            type="button"
            className="tt-toast__close"
            aria-label="Dismiss"
            title="Dismiss"
            onClick={(event) => {
              const hadFocus = event.currentTarget === document.activeElement;
              dismiss(item.id);
              if (hadFocus) moveFocusAfterDismiss(event.currentTarget);
            }}
          >
            <Icon icon={X} />
          </button>
        </div>
      ))}
    </div>
  );
}
