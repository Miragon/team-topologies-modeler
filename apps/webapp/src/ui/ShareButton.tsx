/** Top-right primary action: copy a self-contained share link to the clipboard. */

import { buildShareUrl } from "@/io/url";
import { useModeler } from "@/state/modelerContext";
import { toast } from "./toast";

export function ShareButton() {
  const { modeler } = useModeler();

  const onShare = async () => {
    const url = buildShareUrl(modeler.exportDocument());
    try {
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, "", url);
      toast("Share link copied to clipboard", "success");
    } catch {
      window.history.replaceState(null, "", url);
      toast("Share link added to the address bar", "info");
    }
  };

  return (
    <button
      type="button"
      className="tt-iconbtn tt-iconbtn--primary"
      onClick={onShare}
      title="Copy a self-contained share link"
    >
      <svg
        className="tt-iconbtn__icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="currentColor"
        aria-hidden
      >
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
      </svg>
      <span>Share</span>
    </button>
  );
}
