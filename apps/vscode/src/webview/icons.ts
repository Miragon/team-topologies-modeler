/**
 * Lucide icons the webview needs beyond the renderer's exported set (ISC licence, © Lucide Icons
 * and Contributors), copied unchanged from lucide 1.59.0, the version the webapp uses. Rendered
 * through the renderer's `iconMarkup`, so size and stroke match every other functional icon.
 */

import type { IconNode } from "@miragon/team-topologies-renderer";

export const ICON_FILE_IMAGE: IconNode = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    },
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
  ["circle", { cx: "10", cy: "12", r: "2" }],
  ["path", { d: "m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22" }],
];

export const ICON_FILE_CODE_CORNER: IconNode = [
  [
    "path",
    {
      d: "M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35",
    },
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
  ["path", { d: "m5 16-3 3 3 3" }],
  ["path", { d: "m9 22 3-3-3-3" }],
];

export const ICON_CIRCLE_X: IconNode = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "m15 9-6 6" }],
  ["path", { d: "m9 9 6 6" }],
];

export const ICON_SHAPES: IconNode = [
  [
    "path",
    {
      d: "M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z",
    },
  ],
  ["rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }],
  ["circle", { cx: "17.5", cy: "17.5", r: "3.5" }],
];

export const ICON_CHECK: IconNode = [["path", { d: "M20 6 9 17l-5-5" }]];
