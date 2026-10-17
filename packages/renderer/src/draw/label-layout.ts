/**
 * Where and how each element's text is laid out. Shared by the SVG renderer and
 * the inline label editor, so the editor sits exactly on top of the rendered
 * label and uses the same typography.
 */

import { INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS } from "@miragon/team-topologies-schema-model";
import {
  isTtAnnotation,
  isTtFlow,
  isTtInteraction,
  type TtElement,
  type TtInteraction,
  type TtTeam,
} from "../model/di-types.js";
import { MIRAGON } from "../theme/index.js";
import { FONT, INK, INK_MUTED } from "./styles.js";

/** Horizontal padding between a shape's outline and its centred label. */
const LABEL_INSET = 10;
const ANNOTATION_PADDING = { left: 10, right: 6, top: 6, bottom: 6 };
export const LINE_HEIGHT = 1.2;

export interface LabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LabelLayout {
  /** The area the text is laid out in, relative to the element's top-left corner. */
  box: LabelBox;
  /** `center`: centred both ways (shape labels). `left-top`: flows from the top-left (annotations). */
  align: "center" | "left-top";
  fontSize: number;
  fontWeight: string;
  letterSpacing?: string;
  fill: string;
}

/** WCAG AA for body text. */
const MIN_TEXT_CONTRAST = 4.5;

type Rgb = readonly [number, number, number];

function parseHexColour(colour: unknown): Rgb | undefined {
  if (typeof colour !== "string") return undefined;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
  if (!match) return undefined;
  const hex =
    match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

function blendOver(colour: Rgb, backdrop: Rgb, opacity: number): Rgb {
  const mix = (index: 0 | 1 | 2) =>
    Math.round(colour[index] * opacity + backdrop[index] * (1 - opacity));
  return [mix(0), mix(1), mix(2)];
}

function relativeLuminance([red, green, blue]: Rgb): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Label colour for text on a shape filled with `fill` at `opacity` over the white sheet:
 * schwarz while it stays readable (every official notation fill), weiss on dark custom fills.
 */
export function readableTextColour(fill: string, opacity = 1): string {
  const fillRgb = parseHexColour(fill);
  const ink = parseHexColour(INK);
  const paper = parseHexColour(MIRAGON.weiss);
  if (!fillRgb || !ink || !paper) return INK;
  const background = blendOver(fillRgb, paper, opacity);
  const inkContrast = contrastRatio(ink, background);
  if (inkContrast >= MIN_TEXT_CONTRAST) return INK;
  return contrastRatio(paper, background) > inkContrast ? MIRAGON.weiss : INK;
}

function shapeTextColour(element: TtTeam | TtInteraction): string {
  if (isTtInteraction(element)) {
    const spec = INTERACTION_MODE_SPECS[element.mode] ?? INTERACTION_MODE_SPECS.collaboration;
    return readableTextColour(element.fill ?? spec.fill, spec.opacity);
  }
  const spec = TEAM_TYPE_SPECS[element.teamType] ?? TEAM_TYPE_SPECS["stream-aligned"];
  return readableTextColour(element.fill ?? spec.fill);
}

/** Width of the flow arrow's head; the label stays on the shaft. */
export function flowHeadWidth(width: number, height: number): number {
  return Math.min(width * 0.16, height * 1.1);
}

export function labelLayout(element: TtElement): LabelLayout {
  const width = Math.max(element.width, 1);
  const height = Math.max(element.height, 1);

  if (isTtAnnotation(element)) {
    return {
      box: {
        x: ANNOTATION_PADDING.left,
        y: ANNOTATION_PADDING.top,
        width: Math.max(width - ANNOTATION_PADDING.left - ANNOTATION_PADDING.right, 1),
        height: Math.max(height - ANNOTATION_PADDING.top - ANNOTATION_PADDING.bottom, 1),
      },
      align: "left-top",
      fontSize: FONT.annotation,
      fontWeight: "400",
      fill: INK,
    };
  }

  if (isTtFlow(element)) {
    const shaftWidth = width - flowHeadWidth(width, height);
    return {
      box: { x: LABEL_INSET, y: 0, width: shaftWidth - 2 * LABEL_INSET, height },
      align: "center",
      fontSize: FONT.small,
      fontWeight: "600",
      letterSpacing: "0.06em",
      fill: INK_MUTED,
    };
  }

  return {
    box: { x: LABEL_INSET, y: 0, width: width - 2 * LABEL_INSET, height },
    align: "center",
    fontSize: isTtInteraction(element) ? FONT.small : FONT.label,
    fontWeight: "600",
    fill: shapeTextColour(element),
  };
}

/**
 * Greedy word-wrap into lines that roughly fit `maxWidth` at the font size.
 * Explicit line breaks are kept. Character-count based (not measured), so the
 * result is identical on every platform and exported SVGs stay stable.
 */
export function wrapLabel(text: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * 0.58)));
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  while (lines.length > 0 && lines[0] === "") lines.shift();
  return lines;
}
