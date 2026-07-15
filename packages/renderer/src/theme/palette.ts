/**
 * Miragon design tokens — the single source of truth for every non-notation colour in the renderer.
 *
 * Values mirror the Miragon corporate identity: the `miragon-brand:modeler-tool-design` skill in
 * `Miragon/corporate-identity`, whose vendored `cd-tokens.generated.css` (next to this file) defines
 * the `--cd-*` custom properties, generated from `brand/tokens.json`. Re-copy that CSS from the skill
 * to update; never fork the hex values by hand. `test/theme.sync.test.ts` fails if this mirror drifts
 * from the vendored CSS.
 *
 * Pure data — no DOM, no imports — so it stays inside the P1 DOM-free discipline and can be consumed
 * by the SVG-drawing constants in `draw/styles.ts`.
 *
 * Brand rule: blue leads (`blau` — surfaces, buttons, links, selection), green accents (`gruen` — key
 * visual, highlights; a fill, never body text on white). The four Team Topologies team-type and
 * interaction colours are the official notation and live in `schema-model/notation.ts` — they are NOT
 * part of this brand ramp.
 */

/** Raw Miragon brand ramp + functional layer — exact `--cd-*` values. */
export const MIRAGON = {
  /** Primary: surfaces, buttons, links, selection, backgrounds. */
  blau: "#335DE5",
  /** Deeper blue for links / accent text on white (WCAG AA, ~5.5:1). */
  blauLink: "#2B50D4",
  /** Lightened blue for accents on dark surfaces (unused here — the canvas is light-only). */
  blauHell: "#6B8AFF",
  /** Accent: key visual, highlights, the brand gradient. Bright — a fill, never text on white. */
  gruen: "#00E676",
  /** Calm neutral surface (warm off-white) — the paper surround. */
  grau: "#F9F7F7",
  /** Text on light; not pure black. */
  schwarz: "#1D1D1D",
  weiss: "#FFFFFF",
  /** Functional / status layer (own layer beside the brand palette; AA as text on white). */
  success: "#0B7A55",
  warning: "#92610A",
  danger: "#C92A2A",
  info: "#2B50D4",
  /** Signature brand gradient — brand moments only. Use verbatim. */
  gradientBrand: "linear-gradient(120deg, #335DE5 30%, #00E676)",
} as const;

/**
 * Every `--cd-*` token this repo depends on, mapped to the value it MUST hold. The drift test parses
 * `cd-tokens.generated.css` and asserts each entry matches, so re-copying the vendored CSS with a
 * changed value fails CI until this mirror (and `MIRAGON`) is updated too.
 */
export const CD_TOKENS: Record<string, string> = {
  "--cd-blau": MIRAGON.blau,
  "--cd-gruen": MIRAGON.gruen,
  "--cd-grau": MIRAGON.grau,
  "--cd-schwarz": MIRAGON.schwarz,
  "--cd-weiss": MIRAGON.weiss,
  "--cd-blau-link": MIRAGON.blauLink,
  "--cd-blau-hell": MIRAGON.blauHell,
  "--cd-success": MIRAGON.success,
  "--cd-success-soft": "rgba(11, 122, 85, 0.12)",
  "--cd-warning": MIRAGON.warning,
  "--cd-warning-soft": "rgba(146, 97, 10, 0.12)",
  "--cd-danger": MIRAGON.danger,
  "--cd-danger-soft": "rgba(201, 42, 42, 0.12)",
  "--cd-info": MIRAGON.info,
  "--cd-info-soft": "rgba(43, 80, 212, 0.12)",
  "--cd-gradient-brand": MIRAGON.gradientBrand,
};
