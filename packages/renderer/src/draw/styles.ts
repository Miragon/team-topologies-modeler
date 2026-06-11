/** Shared rendering constants (typography, accent, priorities). */

/** BaseRenderer default priority is 1000; 1500 wins the render.shape/connection event. */
export const TT_RENDER_PRIORITY = 1500;

/** Selection / hover accent (kept in sync with the app theme). */
export const ACCENT = "#4f46e5";

export const INK = "#1f2430";
export const INK_SOFT = "#525a6b";

export const FONT = {
  /**
   * Set directly as the `font-family` attribute on every SVG <text> (canvas
   * labels and therefore the SVG export too) — not inherited from a CSS
   * container. Falls back to system sans when the host doesn't provide Inter.
   */
  family: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  label: 13.5,
  small: 11,
} as const;

/** Paper colour used for the label halo so text stays legible over lines. */
export const PAPER = "#ffffff";
