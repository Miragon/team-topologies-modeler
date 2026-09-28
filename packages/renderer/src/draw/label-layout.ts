/**
 * Where and how each element's text is laid out. Shared by the SVG renderer and
 * the inline label editor, so the editor sits exactly on top of the rendered
 * label and uses the same typography.
 */

import { isTtAnnotation, isTtFlow, isTtInteraction, type TtElement } from "../model/di-types.js";
import { FONT, INK, INK_SOFT } from "./styles.js";

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
      fontWeight: "450",
      fill: INK,
    };
  }

  if (isTtFlow(element)) {
    const shaftWidth = width - flowHeadWidth(width, height);
    return {
      box: { x: LABEL_INSET, y: 0, width: shaftWidth - 2 * LABEL_INSET, height },
      align: "center",
      fontSize: FONT.small,
      fontWeight: "650",
      letterSpacing: "0.06em",
      fill: INK_SOFT,
    };
  }

  return {
    box: { x: LABEL_INSET, y: 0, width: width - 2 * LABEL_INSET, height },
    align: "center",
    fontSize: isTtInteraction(element) ? FONT.small : FONT.label,
    fontWeight: isTtInteraction(element) ? "600" : "640",
    fill: INK,
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
