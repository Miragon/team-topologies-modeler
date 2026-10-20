/**
 * Functional icons for the canvas chrome (context pad, palette tools), returned as inline SVG
 * markup.
 *
 * Lucide icons (ISC licence, © Lucide Icons and Contributors), copied unchanged from
 * lucide-static 1.59.0 and inlined so the published renderer has no icon runtime dependency.
 */

/** One Lucide icon: its SVG child elements on the 24 × 24 grid. */
export type IconNode = ReadonlyArray<readonly [string, Readonly<Record<string, string>>]>;

export interface IconMarkupOptions {
  /** Rendered width and height in px; the viewBox stays on the 24 × 24 grid. */
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const ICON_PENCIL: IconNode = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
    },
  ],
  ["path", { d: "m15 5 4 4" }],
];

export const ICON_TRASH: IconNode = [
  ["path", { d: "M10 11v6" }],
  ["path", { d: "M14 11v6" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
  ["path", { d: "M3 6h18" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }],
];

export const ICON_LINK: IconNode = [
  ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }],
  ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }],
];

export const ICON_MESSAGE_SQUARE_PLUS: IconNode = [
  [
    "path",
    {
      d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
    },
  ],
  ["path", { d: "M12 8v6" }],
  ["path", { d: "M9 11h6" }],
];

export const ICON_SQUARE_DASHED_MOUSE_POINTER: IconNode = [
  [
    "path",
    {
      d: "M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z",
    },
  ],
  ["path", { d: "M5 3a2 2 0 0 0-2 2" }],
  ["path", { d: "M19 3a2 2 0 0 1 2 2" }],
  ["path", { d: "M5 21a2 2 0 0 1-2-2" }],
  ["path", { d: "M9 3h1" }],
  ["path", { d: "M9 21h2" }],
  ["path", { d: "M14 3h1" }],
  ["path", { d: "M3 9v1" }],
  ["path", { d: "M21 9v2" }],
  ["path", { d: "M3 14v1" }],
];

/**
 * @deprecated Host chrome only (menu, zoom panel, dialogs); hosts take their chrome and its icons
 * from `@miragon/modeler-shell`. Kept for existing consumers, removed in a later release.
 */
export const ICON_MENU: IconNode = [
  ["path", { d: "M4 5h16" }],
  ["path", { d: "M4 12h16" }],
  ["path", { d: "M4 19h16" }],
];

/**
 * @deprecated Host chrome only (menu, zoom panel, dialogs); hosts take their chrome and its icons
 * from `@miragon/modeler-shell`. Kept for existing consumers, removed in a later release.
 */
export const ICON_MINUS: IconNode = [["path", { d: "M5 12h14" }]];

/**
 * @deprecated Host chrome only (menu, zoom panel, dialogs); hosts take their chrome and its icons
 * from `@miragon/modeler-shell`. Kept for existing consumers, removed in a later release.
 */
export const ICON_PLUS: IconNode = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "M12 5v14" }],
];

/**
 * @deprecated Host chrome only (menu, zoom panel, dialogs); hosts take their chrome and its icons
 * from `@miragon/modeler-shell`. Kept for existing consumers, removed in a later release.
 */
export const ICON_MAXIMIZE: IconNode = [
  ["path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }],
  ["path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }],
  ["path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }],
];

/**
 * @deprecated Host chrome only (menu, zoom panel, dialogs); hosts take their chrome and its icons
 * from `@miragon/modeler-shell`. Kept for existing consumers, removed in a later release.
 */
export const ICON_DOWNLOAD: IconNode = [
  ["path", { d: "M12 15V3" }],
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
  ["path", { d: "m7 10 5 5 5-5" }],
];

/**
 * @deprecated Host chrome only (menu, zoom panel, dialogs); hosts take their chrome and its icons
 * from `@miragon/modeler-shell`. Kept for existing consumers, removed in a later release.
 */
export const ICON_X: IconNode = [
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }],
];

const ICON_STROKE_WIDTH = 2.5;
const ICON_SIZE = 16;

/**
 * The SVG elements and attributes Lucide icon nodes are made of. The markup is assigned to
 * innerHTML by hosts, so anything else a caller passes in (a <script>, an onload) is dropped.
 */
const SVG_ELEMENTS = ["path", "circle", "ellipse", "line", "polyline", "polygon", "rect"] as const;
const SVG_ATTRIBUTES = [
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "width",
  "height",
  "points",
] as const;

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function positiveNumberOr(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/** Decorative (`aria-hidden`) inline SVG for a Lucide icon; the control around it carries the name. */
export function iconMarkup(icon: IconNode, options: IconMarkupOptions = {}): string {
  const size = positiveNumberOr(options.size, ICON_SIZE);
  const strokeWidth = positiveNumberOr(options.strokeWidth, ICON_STROKE_WIDTH);
  const classAttribute = options.className ? ` class="${escapeAttribute(options.className)}"` : "";
  const children = icon
    .map(([tag, attributes]) => {
      const element = SVG_ELEMENTS.find((allowed) => allowed === tag);
      if (!element) return "";
      const attributeList = Object.entries(attributes)
        .flatMap(([name, value]) => {
          const attribute = SVG_ATTRIBUTES.find((allowed) => allowed === name);
          return attribute ? [`${attribute}="${escapeAttribute(String(value))}"`] : [];
        })
        .join(" ");
      return `<${element} ${attributeList}/>`;
    })
    .join("");
  return (
    `<svg${classAttribute} xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"` +
    ` fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"` +
    ` stroke-linejoin="round" aria-hidden="true" focusable="false">${children}</svg>`
  );
}
