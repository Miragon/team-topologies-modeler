/**
 * Geist inside an exported SVG. An SVG drawn as an image (the usual way to rasterise it into a PNG)
 * is an isolated document: it can't use the host page's @font-face rules, so its labels would fall
 * back to a system font. The host passes the font files as data URLs, because it owns them (for
 * example from `@fontsource-variable/geist`); the library ships no font.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** The latin subsets of `@fontsource-variable/geist`, with the unicode ranges it publishes. */
export const GEIST_UNICODE_RANGES = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  latinExt:
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
} as const;

/** A `data:` URL of each latin Geist variable-weight WOFF2 file. */
export type GeistFontDataUrls = Record<keyof typeof GEIST_UNICODE_RANGES, string>;

/** @font-face rules for the family the canvas labels ask for ('Geist Variable'). */
export function geistFontFaceCss(fonts: GeistFontDataUrls): string {
  return (Object.keys(GEIST_UNICODE_RANGES) as (keyof GeistFontDataUrls)[])
    .map((subset) => {
      const dataUrl = fonts[subset].replace(/^data:[^;,]*/, "data:font/woff2");
      return (
        `@font-face{font-family:'Geist Variable';font-style:normal;font-weight:100 900;` +
        `font-display:block;src:url(${dataUrl}) format('woff2');` +
        `unicode-range:${GEIST_UNICODE_RANGES[subset]};}`
      );
    })
    .join("");
}

/** Puts `css` into a <style> at the top of a standalone SVG; returns the SVG unchanged if unparsable. */
export function embedSvgStyles(svg: string, css: string): string {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsed.documentElement;
  if (root.namespaceURI !== SVG_NAMESPACE || parsed.querySelector("parsererror")) return svg;
  const defs = parsed.createElementNS(SVG_NAMESPACE, "defs");
  const style = parsed.createElementNS(SVG_NAMESPACE, "style");
  style.textContent = css;
  defs.appendChild(style);
  root.insertBefore(defs, root.firstChild);
  return new XMLSerializer().serializeToString(parsed);
}
