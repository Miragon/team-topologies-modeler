/** Top-right primary action: copy a self-contained share link to the clipboard. */

import { Share2 } from "lucide-react";
import { Icon } from "@miragon/team-topologies-ui";
import { buildShareUrl, writeDocumentToLocation } from "@/io/url";
import { useModeler } from "@/state/modelerContext";
import { toast } from "./toast";

export function ShareButton() {
  const { modeler } = useModeler();

  const onShare = async () => {
    const doc = modeler.exportDocument();
    const url = buildShareUrl(doc);
    // writeDocumentToLocation refuses links too long for the address bar; chat tools tend to
    // truncate those too, so the user gets a warning instead of a plain success.
    const fitsAddressBar = writeDocumentToLocation(doc);
    try {
      await navigator.clipboard.writeText(url);
      if (fitsAddressBar) {
        toast("Link copied", "success");
      } else {
        toast(
          "Link copied. It's very long and may break in some chat apps. Share the JSON file instead if it doesn't open.",
          "warning",
          { duration: 5000 },
        );
      }
    } catch {
      window.history.replaceState(null, "", url);
      toast("Couldn't copy the link. Copy it from the address bar instead.", "warning", {
        duration: 5000,
      });
    }
  };

  return (
    <button
      type="button"
      className="tt-iconbtn tt-iconbtn--primary tt-share"
      onClick={onShare}
      title="Copy a link to this diagram"
    >
      <Icon icon={Share2} />
      <span className="tt-iconbtn__label">Share</span>
    </button>
  );
}
