/**
 * Creates diagram-js runtime elements carrying Team Topologies markers, from
 * canonical document elements (import) or from scratch (palette drag-to-create).
 * Teams, interaction glyphs, the flow arrow and annotations are shapes; the
 * annotation connector is the only connection.
 */

import type ElementFactory from "diagram-js/lib/core/ElementFactory";
import { getMid } from "diagram-js/lib/layout/LayoutUtil";
import {
  ANNOTATION_SPEC,
  FLOW_SPEC,
  INTERACTION_MODE_SPECS,
  TEAM_TYPE_SPECS,
  newId,
} from "@miragon/team-topologies-schema-model";
import type {
  FlowShape,
  InteractionMode,
  InteractionShape,
  TeamNode,
  TeamType,
  TextAnnotation,
} from "@miragon/team-topologies-schema-model";
import type {
  TtAnnotation,
  TtAssociation,
  TtElement,
  TtFlow,
  TtInteraction,
  TtTeam,
} from "./di-types.js";

export default class TtElementFactory {
  static $inject = ["elementFactory"];

  constructor(private readonly elementFactory: ElementFactory) {}

  // --- from canonical document elements (import) -------------------------

  createTeam(node: TeamNode): TtTeam {
    return this.elementFactory.createShape({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.size.width,
      height: node.size.height,
      ttKind: "team",
      teamType: node.type,
      ttLabel: node.label,
      ...(node.description ? { description: node.description } : {}),
      ...(node.fill ? { fill: node.fill } : {}),
      ...(node.stroke ? { stroke: node.stroke } : {}),
    } as Partial<TtTeam>) as unknown as TtTeam;
  }

  createInteraction(shape: InteractionShape): TtInteraction {
    return this.elementFactory.createShape({
      id: shape.id,
      x: shape.position.x,
      y: shape.position.y,
      width: shape.size.width,
      height: shape.size.height,
      ttKind: "interaction",
      mode: shape.mode,
      ...(shape.label ? { ttLabel: shape.label } : {}),
      ...(shape.fill ? { fill: shape.fill } : {}),
      ...(shape.stroke ? { stroke: shape.stroke } : {}),
    } as Partial<TtInteraction>) as unknown as TtInteraction;
  }

  createFlow(shape: FlowShape): TtFlow {
    return this.elementFactory.createShape({
      id: shape.id,
      x: shape.position.x,
      y: shape.position.y,
      width: shape.size.width,
      height: shape.size.height,
      ttKind: "flow",
      ...(shape.label ? { ttLabel: shape.label } : {}),
    } as Partial<TtFlow>) as unknown as TtFlow;
  }

  createAnnotation(annotation: TextAnnotation): TtAnnotation {
    return this.elementFactory.createShape({
      id: annotation.id,
      x: annotation.position.x,
      y: annotation.position.y,
      width: annotation.size.width,
      height: annotation.size.height,
      ttKind: "annotation",
      ...(annotation.text ? { ttLabel: annotation.text } : {}),
    } as Partial<TtAnnotation>) as unknown as TtAnnotation;
  }

  /**
   * The connector of an imported, attached annotation. Its id is derived from
   * the annotation (connectors aren't stored in the document), so re-importing
   * the same document yields the same id.
   */
  createAssociation(annotation: TtAnnotation, target: TtElement): TtAssociation {
    return this.elementFactory.createConnection({
      id: `assoc_${annotation.id}`,
      ttKind: "association",
      source: annotation,
      target,
      waypoints: [getMid(annotation), getMid(target)],
    } as Partial<TtAssociation>) as unknown as TtAssociation;
  }

  // --- fresh, not-yet-placed shapes (palette / context-pad create) -------
  //
  // These set an explicit model-style id (`team_…`/`int_…`/`flow_…`, matching
  // the model package's factory). We must NOT fall back to diagram-js' own
  // auto-id: its counter starts at `shape_12` and is not advanced past ids that
  // come in via import, so a re-imported `shape_N` (an element created in a
  // previous session, then autosaved) collides with the next palette create —
  // the first placement after a reload then throws "element already exists".

  createNewTeam(type: TeamType, label?: string): TtTeam {
    const spec = TEAM_TYPE_SPECS[type];
    return this.elementFactory.createShape({
      id: newId("team"),
      width: spec.defaultSize.width,
      height: spec.defaultSize.height,
      ttKind: "team",
      teamType: type,
      ttLabel: label ?? spec.label,
    } as Partial<TtTeam>) as unknown as TtTeam;
  }

  createNewInteraction(mode: InteractionMode): TtInteraction {
    const spec = INTERACTION_MODE_SPECS[mode];
    return this.elementFactory.createShape({
      id: newId("int"),
      width: spec.defaultSize.width,
      height: spec.defaultSize.height,
      ttKind: "interaction",
      mode,
    } as Partial<TtInteraction>) as unknown as TtInteraction;
  }

  createNewFlow(): TtFlow {
    return this.elementFactory.createShape({
      id: newId("flow"),
      width: FLOW_SPEC.defaultSize.width,
      height: FLOW_SPEC.defaultSize.height,
      ttKind: "flow",
      ttLabel: FLOW_SPEC.label,
    } as Partial<TtFlow>) as unknown as TtFlow;
  }

  createNewAnnotation(text?: string): TtAnnotation {
    return this.elementFactory.createShape({
      id: newId("ann"),
      width: ANNOTATION_SPEC.defaultSize.width,
      height: ANNOTATION_SPEC.defaultSize.height,
      ttKind: "annotation",
      ...(text ? { ttLabel: text } : {}),
    } as Partial<TtAnnotation>) as unknown as TtAnnotation;
  }

  /** A not-yet-connected association; modeling sets its ends and waypoints. */
  createNewAssociation(): TtAssociation {
    return this.elementFactory.createConnection({
      id: newId("assoc"),
      ttKind: "association",
    } as Partial<TtAssociation>) as unknown as TtAssociation;
  }
}
