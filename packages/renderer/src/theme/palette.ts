/**
 * Miragon design tokens — the single source of truth for every non-notation colour in the renderer.
 *
 * Values mirror the Miragon corporate identity: the `miragon-brand:modeler-tool-design` skill in
 * `Miragon/corporate-identity`, whose vendored `cd-tokens.generated.css` (next to this file) defines
 * the `--cd-*` custom properties, generated from `brand/tokens.json`. Re-copy that CSS from the skill
 * to update; never fork the hex values by hand. `packages/renderer/src/theme/theme.sync.test.ts`
 * fails if this mirror drifts from the vendored CSS.
 *
 * Pure data — no DOM, no imports — so it stays inside the P1 DOM-free discipline and can be consumed
 * by the SVG-drawing constants in `draw/styles.ts`.
 *
 * Brand rule: blue leads (`blau` — surfaces, buttons, links, selection), green accents (`gruen` — key
 * visual, highlights; a fill, never body text on white). The four Team Topologies team-type and
 * interaction colours are the official notation and live in `schema-model/notation.ts` — they are NOT
 * part of this brand ramp.
 */

/** Raw Miragon brand ramp + UI neutrals + functional layer — exact `--cd-*` values. */
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
  /** Dividers and decorative borders; no contrast requirement. */
  linie: "#E6E2E2",
  /** Non-text elements that need ≥ 3:1 (input borders, structural strokes and connectors). */
  kontur: "#8F8A8A",
  /** Secondary text, ≥ 4.5:1 on `weiss` and on `grau`. */
  textLeise: "#6B6666",
  /**
   * Functional / status layer. `success` and `warning` are fills, borders, icons and dots only —
   * never text or thin strokes on light (1.67:1 / 1.83:1). `danger` and `info` also carry text
   * (AA on white). Each `-soft` is an opaque tint for notice boxes and badges.
   */
  success: "#00E676",
  successSoft: "#DAFBEB",
  warning: "#FFB000",
  warningSoft: "#FFF1D2",
  danger: "#CD1839",
  dangerSoft: "#FBEEF0",
  info: "#335DE5",
  infoSoft: "#EEF1FD",
  /** Each `-hell` is the status colour for dark surfaces (unused here — the canvas is light-only). */
  successHell: "#00E676",
  warningHell: "#FFB000",
  dangerHell: "#FB6D73",
  infoHell: "#6B8AFF",
  /** Signature brand gradient — brand moments only. Use verbatim. */
  gradientBrand: "linear-gradient(120deg, #335DE5 30%, #00E676)",
} as const;

/**
 * Every `--cd-*` token this repo depends on, mapped to the value it MUST hold. The drift test parses
 * `cd-tokens.generated.css` and asserts each entry matches, so re-copying the vendored CSS with a
 * changed value fails CI until this mirror (and `MIRAGON`) is updated too. `--cd-gradient-format`
 * stays unmirrored: nothing here uses the format-tile gradient.
 */
export const CD_TOKENS: Record<string, string> = {
  "--cd-blau": MIRAGON.blau,
  "--cd-gruen": MIRAGON.gruen,
  "--cd-grau": MIRAGON.grau,
  "--cd-schwarz": MIRAGON.schwarz,
  "--cd-weiss": MIRAGON.weiss,
  "--cd-blau-link": MIRAGON.blauLink,
  "--cd-blau-hell": MIRAGON.blauHell,
  "--cd-linie": MIRAGON.linie,
  "--cd-kontur": MIRAGON.kontur,
  "--cd-text-leise": MIRAGON.textLeise,
  "--cd-success": MIRAGON.success,
  "--cd-success-soft": MIRAGON.successSoft,
  "--cd-warning": MIRAGON.warning,
  "--cd-warning-soft": MIRAGON.warningSoft,
  "--cd-danger": MIRAGON.danger,
  "--cd-danger-soft": MIRAGON.dangerSoft,
  "--cd-info": MIRAGON.info,
  "--cd-info-soft": MIRAGON.infoSoft,
  "--cd-success-hell": MIRAGON.successHell,
  "--cd-warning-hell": MIRAGON.warningHell,
  "--cd-danger-hell": MIRAGON.dangerHell,
  "--cd-info-hell": MIRAGON.infoHell,
  "--cd-gradient-brand": MIRAGON.gradientBrand,
};
