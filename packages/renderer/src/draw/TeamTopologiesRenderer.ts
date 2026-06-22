/**
 * SVG rendering of the Team Topologies notation (BaseRenderer subclass).
 * Everything is a placed shape:
 *  - teams: SOLID resizable boxes (label wrapped inside), distinguished by shape
 *    as well as colour;
 *  - interactions: DASHED, 50%-transparent glyphs (collaboration = parallelogram,
 *    x-as-a-service = triangle, facilitating = circle) laid over team boundaries;
 *  - flow: a dashed "flow of change" arrow.
 *
 * Colours/shapes come from the single notation source (`@miragon/team-topologies-schema-model`).
 */

import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import { append as svgAppend, create as svgCreate, attr as svgAttr } from "tiny-svg";
import type EventBus from "diagram-js/lib/core/EventBus";
import type { ElementLike, ShapeLike } from "diagram-js/lib/model/Types";
import {
  FLOW_SPEC,
  INTERACTION_MODE_SPECS,
  TEAM_TYPE_SPECS,
  dashArray,
} from "@miragon/team-topologies-schema-model";
import { FONT, INK, INK_SOFT } from "./styles.js";
import { TT_RENDER_PRIORITY } from "./styles.js";
import {
  isTtElement,
  isTtFlow,
  isTtInteraction,
  isTtTeam,
  type TtFlow,
  type TtInteraction,
  type TtTeam,
} from "../model/di-types.js";

type Attrs = Record<string, string | number>;

export default class TeamTopologiesRenderer extends BaseRenderer {
  static $inject = ["eventBus"];

  constructor(eventBus: EventBus) {
    super(eventBus, TT_RENDER_PRIORITY);
  }

  override canRender(element: ElementLike): boolean {
    return isTtElement(element);
  }

  override drawShape(visuals: SVGElement, element: ShapeLike): SVGElement {
    if (isTtTeam(element)) return this.drawTeam(visuals, element);
    if (isTtInteraction(element)) return this.drawInteraction(visuals, element);
    if (isTtFlow(element)) return this.drawFlow(visuals, element);
    const rect = svgAttr(svgCreate("rect"), {
      width: element.width,
      height: element.height,
      fill: "#eee",
    });
    svgAppend(visuals, rect);
    return rect;
  }

  override getShapePath(shape: ShapeLike): string {
    const { x, y, width, height } = shape;
    return `M${x},${y}l${width},0l0,${height}l${-width},0z`;
  }

  // --- teams ---------------------------------------------------------------

  private drawTeam(visuals: SVGElement, team: TtTeam): SVGElement {
    const spec = TEAM_TYPE_SPECS[team.teamType] ?? TEAM_TYPE_SPECS["stream-aligned"];
    const w = Math.max(team.width, 1);
    const h = Math.max(team.height, 1);
    const sw = spec.strokeWidth;
    const dash = dashArray(spec.strokeStyle, sw);
    const outline = this.teamOutline(spec.shape, w, h, sw, {
      fill: team.fill ?? spec.fill,
      stroke: team.stroke ?? spec.stroke,
      "stroke-width": sw,
      ...(dash ? { "stroke-dasharray": dash } : {}),
      "stroke-linejoin": "round",
    });
    svgAppend(visuals, outline);
    this.appendLabel(visuals, team.ttLabel ?? "", w, h, { "font-weight": "640" });
    return outline;
  }

  private teamOutline(kind: string, w: number, h: number, sw: number, attrs: Attrs): SVGElement {
    const i = sw / 2;
    const iw = w - sw;
    const ih = h - sw;
    if (kind === "octagon") {
      const c = Math.min(iw, ih) * 0.29;
      return svgAttr(svgCreate("polygon"), { points: octagon(i, iw, ih, c), ...attrs });
    }
    const rx = kind === "rect" ? 4 : Math.min(20, ih / 2, iw / 2);
    return svgAttr(svgCreate("rect"), { x: i, y: i, width: iw, height: ih, rx, ry: rx, ...attrs });
  }

  // --- interactions --------------------------------------------------------

  private drawInteraction(visuals: SVGElement, el: TtInteraction): SVGElement {
    const spec = INTERACTION_MODE_SPECS[el.mode] ?? INTERACTION_MODE_SPECS.collaboration;
    const w = Math.max(el.width, 1);
    const h = Math.max(el.height, 1);
    const sw = 2;
    const i = sw / 2;
    const common: Attrs = {
      fill: el.fill ?? spec.fill,
      "fill-opacity": spec.opacity,
      stroke: el.stroke ?? spec.stroke,
      "stroke-width": sw,
      "stroke-dasharray": dashArray(spec.strokeStyle, sw) || "6 4",
      "stroke-linejoin": "round",
    };

    let glyph: SVGElement;
    if (spec.shape === "circle") {
      glyph = svgAttr(svgCreate("ellipse"), {
        cx: w / 2,
        cy: h / 2,
        rx: (w - sw) / 2,
        ry: (h - sw) / 2,
        ...common,
      });
    } else if (spec.shape === "triangle") {
      // Point up — the tip indicates the direction the service is provided.
      const pts = `${w / 2},${i} ${w - i},${h - i} ${i},${h - i}`;
      glyph = svgAttr(svgCreate("polygon"), { points: pts, ...common });
    } else {
      const skew = Math.min(w * 0.26, h * 0.85);
      const pts = `${i + skew},${i} ${w - i},${i} ${w - i - skew},${h - i} ${i},${h - i}`;
      glyph = svgAttr(svgCreate("polygon"), { points: pts, ...common });
    }
    svgAppend(visuals, glyph);

    if (el.ttLabel) {
      this.appendLabel(visuals, el.ttLabel, w, h, {
        "font-size": FONT.small,
        "font-weight": "600",
      });
    }
    return glyph;
  }

  // --- flow of change ------------------------------------------------------

  private drawFlow(visuals: SVGElement, el: TtFlow): SVGElement {
    const w = Math.max(el.width, 1);
    const h = Math.max(el.height, 1);
    const sw = FLOW_SPEC.strokeWidth;
    const i = sw / 2;
    const head = Math.min(w * 0.16, h * 1.1);
    const shaft = h * 0.5;
    const top = (h - shaft) / 2;
    const bot = top + shaft;
    const pts = [
      [i, top],
      [w - head, top],
      [w - head, i],
      [w - i, h / 2],
      [w - head, h - i],
      [w - head, bot],
      [i, bot],
    ]
      .map((p) => p.join(","))
      .join(" ");
    const arrow = svgAttr(svgCreate("polygon"), {
      points: pts,
      fill: "none",
      stroke: FLOW_SPEC.stroke,
      "stroke-width": sw,
      "stroke-dasharray": dashArray(FLOW_SPEC.strokeStyle, sw) || "6 4",
      "stroke-linejoin": "round",
    });
    svgAppend(visuals, arrow);
    if (el.ttLabel) {
      this.appendLabel(visuals, el.ttLabel, w - head, h, {
        "font-size": FONT.small,
        "font-weight": "650",
        "letter-spacing": "0.06em",
        fill: INK_SOFT,
      });
    }
    return arrow;
  }

  // --- shared label rendering (wrapped, centred, no halo) ------------------

  private appendLabel(visuals: SVGElement, text: string, w: number, h: number, attrs: Attrs): void {
    const fontSize =
      typeof attrs["font-size"] === "number" ? (attrs["font-size"] as number) : FONT.label;
    const lines = wrapLabel(text, w - 20, fontSize);
    const lineHeight = fontSize * 1.2;
    const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((ln, idx) => {
      const t = svgAttr(svgCreate("text"), {
        x: w / 2,
        y: startY + idx * lineHeight,
        "font-family": FONT.family,
        "font-size": fontSize,
        fill: INK,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        ...attrs,
      });
      t.textContent = ln;
      svgAppend(visuals, t);
    });
  }
}

// --- helpers ---------------------------------------------------------------

function octagon(i: number, w: number, h: number, c: number): string {
  return [
    [i + c, i],
    [i + w - c, i],
    [i + w, i + c],
    [i + w, i + h - c],
    [i + w - c, i + h],
    [i + c, i + h],
    [i, i + h - c],
    [i, i + c],
  ]
    .map((p) => p.join(","))
    .join(" ");
}

/** Greedy word-wrap into lines that roughly fit `maxWidth` at the font size. */
function wrapLabel(text: string, maxWidth: number, fontSize: number): string[] {
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * 0.58)));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word;
    if (candidate.length > maxChars && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
