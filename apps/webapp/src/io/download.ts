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

const TRANSLITERATIONS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

/** Turns a diagram title into a safe file name stem. */
export function slugify(title: string, fallback = "team-topology"): string {
  const slug = title
    .normalize("NFC")
    .toLowerCase()
    // German umlauts become ae/oe/ue/ss first; NFKD would otherwise reduce them to a bare vowel.
    .replace(/[äöüß]/g, (letter) => TRANSLITERATIONS[letter] ?? letter)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || fallback;
}
