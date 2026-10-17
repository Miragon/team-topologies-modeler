/**
 * Answers `useUiStore.requestConfirm` (guide §9 "Destruktiv"). Cancel holds the initial focus, so
 * an accidental Enter never replaces a diagram.
 */

import { useRef } from "react";
import { Modal } from "./Modal";
import { useUiStore } from "./uiStore";

export function ConfirmDialog() {
  const request = useUiStore((s) => s.confirm);
  const settle = useUiStore((s) => s.settleConfirm);
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (!request) return null;

  const confirmClass =
    request.tone === "destructive" ? "tt-btn tt-btn--destructive" : "tt-btn tt-btn--primary";

  return (
    <Modal
      key={request.id}
      title={request.title}
      role="alertdialog"
      size="sm"
      onClose={() => settle(false)}
      initialFocusRef={cancelRef}
      footer={
        <>
          <button ref={cancelRef} type="button" className="tt-btn" onClick={() => settle(false)}>
            Cancel
          </button>
          <button type="button" className={confirmClass} onClick={() => settle(true)}>
            {request.confirmLabel}
          </button>
        </>
      }
    >
      <p>{request.message}</p>
    </Modal>
  );
}
