/** Renders the active toast notifications. */

import { useToastStore } from "./toast";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="tt-toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tt-toast tt-toast--${t.tone}`}
          onClick={() => dismiss(t.id)}
          title="Dismiss"
          aria-label={`Dismiss notification: ${t.message}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
