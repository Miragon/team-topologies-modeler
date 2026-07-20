/**
 * Shared rendering constants (typography, accent, priorities) — Miragon corporate identity.
 *  Colours are derived from the single source of truth in `theme/palette.ts` (`MIRAGON`), which
 *  mirrors the vendored `--cd-*` brand tokens.
 */

import { MIRAGON } from "../theme/index.js";

/** BaseRenderer default priority is 1000; 1500 wins the render.shape/connection event. */
export const TT_RENDER_PRIORITY = 1500;

/** Selection / hover accent (Miragon blue — kept in sync with the app theme via the shared palette). */
export const ACCENT = MIRAGON.blau;

export const INK = MIRAGON.schwarz;
export const INK_SOFT = "#5B5B5B";

export const FONT = {
  /**
   * Set directly as the `font-family` attribute on every SVG <text> (canvas
   * labels and therefore the SVG export too) — not inherited from a CSS
   * container. Prefers the self-hosted Miragon typeface Geist (registered as
   * 'Geist Variable' by @fontsource-variable/geist, with 'Geist' as a fallback
   * name), and falls back to a system sans when the host hasn't loaded it (e.g.
   * an exported SVG opened standalone).
   */
  family:
    "'Geist Variable', 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  label: 13.5,
  small: 11,
} as const;

/** Paper colour used for the label halo so text stays legible over lines. */
export const PAPER = MIRAGON.weiss;
