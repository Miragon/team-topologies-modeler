/**
 * SVG rendering of the Team Topologies notation (BaseRenderer subclass):
 *  - teams: SOLID resizable boxes (label wrapped inside), distinguished by shape
 *    as well as colour;
 *  - interactions: DASHED, 50%-transparent glyphs (collaboration = parallelogram,
 *    x-as-a-service = triangle, facilitating = circle) laid over team boundaries;
 *  - flow: a dashed "flow of change" arrow;
 *  - annotations: a BPMN-style open bracket with free text, and the dashed
 *    association connecting an annotation to the element it is attached to.
 *
 * Colours/shapes come from the single notation source (`@miragon/team-topologies-schema-model`).
 */

import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import { append as svgAppend, create as svgCreate, attr as svgAttr } from "tiny-svg";
import type EventBus from "diagram-js/lib/core/EventBus";
import type { ConnectionLike, ElementLike, ShapeLike } from "diagram-js/lib/model/Types";
import {
  FLOW_SPEC,
  INTERACTION_MODE_SPECS,
  TEAM_TYPE_SPECS,
  dashArray,
} from "@miragon/team-topologies-schema-model";
import { FONT, INK_SOFT } from "./styles.js";
import { TT_RENDER_PRIORITY } from "./styles.js";
import {
  LINE_HEIGHT,
  flowHeadWidth,
  labelLayout,
  wrapLabel,
  type LabelLayout,
} from "./label-layout.js";
import {
  isTtAnnotation,
  isTtAssociation,
  isTtElement,
  isTtFlow,
  isTtInteraction,
  isTtTeam,
  type TtAnnotation,
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
    return isTtElement(element) || isTtAssociation(element);
  }

  override drawShape(visuals: SVGElement, element: ShapeLike): SVGElement {
    if (isTtTeam(element)) return this.drawTeam(visuals, element);
    if (isTtInteraction(element)) return this.drawInteraction(visuals, element);
    if (isTtFlow(element)) return this.drawFlow(visuals, element);
    if (isTtAnnotation(element)) return this.drawAnnotation(visuals, element);
    const rect = svgAttr(svgCreate("rect"), {
      width: element.width,
      height: element.height,
      fill: "#eee",
    });
    svgAppend(visuals, rect);
    return rect;
  }

  override drawConnection(visuals: SVGElement, connection: ConnectionLike): SVGElement {
    const line = svgAttr(svgCreate("path"), {
      d: waypointsPath(connection.waypoints),
      fill: "none",
      stroke: INK_SOFT,
      "stroke-width": 1.5,
      "stroke-dasharray": "4 4",
      "stroke-linecap": "round",
    });
    svgAppend(visuals, line);
    return line;
  }

  override getShapePath(shape: ShapeLike): string {
    const { x, y, width, height } = shape;
    return `M${x},${y}l${width},0l0,${height}l${-width},0z`;
  }

  override getConnectionPath(connection: ConnectionLike): string {
    return waypointsPath(connection.waypoints);
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
    this.appendLabel(visuals, team.ttLabel ?? "", labelLayout(team));
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
    this.appendLabel(visuals, el.ttLabel ?? "", labelLayout(el));
    return glyph;
  }

  // --- flow of change ------------------------------------------------------

  private drawFlow(visuals: SVGElement, el: TtFlow): SVGElement {
    const w = Math.max(el.width, 1);
    const h = Math.max(el.height, 1);
    const sw = FLOW_SPEC.strokeWidth;
    const i = sw / 2;
    const head = flowHeadWidth(w, h);
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
    this.appendLabel(visuals, el.ttLabel ?? "", labelLayout(el));
    return arrow;
  }

  // --- annotations ---------------------------------------------------------

  private drawAnnotation(visuals: SVGElement, el: TtAnnotation): SVGElement {
    const w = Math.max(el.width, 1);
    const h = Math.max(el.height, 1);
    const sw = 1.5;
    const i = sw / 2;
    const arm = Math.min(14, w / 2);
    const bracket = svgAttr(svgCreate("path"), {
      d: `M${arm},${i} L${i},${i} L${i},${h - i} L${arm},${h - i}`,
      fill: "none",
      stroke: INK_SOFT,
      "stroke-width": sw,
      "stroke-linejoin": "round",
    });
    svgAppend(visuals, bracket);
    this.appendLabel(visuals, el.ttLabel ?? "", labelLayout(el));
    return bracket;
  }

  // --- shared label rendering (wrapped, no halo) ---------------------------

  private appendLabel(visuals: SVGElement, text: string, layout: LabelLayout): void {
    const { box, fontSize } = layout;
    const lines = wrapLabel(text, box.width, fontSize);
    const lineHeight = fontSize * LINE_HEIGHT;
    const centred = layout.align === "center";
    const x = centred ? box.x + box.width / 2 : box.x;
    const startY = centred
      ? box.y + box.height / 2 - ((lines.length - 1) * lineHeight) / 2
      : box.y + lineHeight / 2;
    lines.forEach((ln, idx) => {
      if (!ln) return;
      const t = svgAttr(svgCreate("text"), {
        x,
        y: startY + idx * lineHeight,
        "font-family": FONT.family,
        "font-size": fontSize,
        fill: layout.fill,
        "text-anchor": centred ? "middle" : "start",
        "dominant-baseline": "central",
        "font-weight": layout.fontWeight,
        ...(layout.letterSpacing ? { "letter-spacing": layout.letterSpacing } : {}),
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

function waypointsPath(waypoints: ReadonlyArray<{ x: number; y: number }>): string {
  return waypoints.map((point, idx) => `${idx === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}
