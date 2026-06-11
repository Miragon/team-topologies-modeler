/** Small DOM helper to trigger a client-side file download from a URL/Blob. */

export function triggerDownload(filename: string, url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  try {
    triggerDownload(filename, url);
  } finally {
    // Revoke on the next tick so the click has a chance to start.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Turns a diagram title into a safe file name stem. */
export function slugify(title: string, fallback = "team-topology"): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}
