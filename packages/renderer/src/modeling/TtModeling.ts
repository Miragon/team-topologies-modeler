/**
 * High-level Team Topologies mutations that go through the command stack
 * (undo/redo). Registers the generic property command handler.
 */

import type CommandStack from "diagram-js/lib/command/CommandStack";
import type Canvas from "diagram-js/lib/core/Canvas";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type { Element, Root } from "diagram-js/lib/model/Types";
import type { InteractionMode, TeamType } from "@miragon/team-topologies-schema-model";
import {
  isTtAssociation,
  type TtAnnotation,
  type TtElement,
  type TtInteraction,
  type TtTeam,
} from "../model/di-types.js";
import type TtElementFactory from "../model/TtElementFactory.js";
import UpdatePropertiesHandler from "./cmd/UpdatePropertiesHandler.js";

const UPDATE_PROPERTIES = "element.updateProperties";

/** Gap between an element and an annotation appended to it. */
const ANNOTATION_GAP = 40;

export default class TtModeling {
  static $inject = ["commandStack", "modeling", "ttElementFactory", "canvas"];

  constructor(
    private readonly commandStack: CommandStack,
    private readonly modeling: Modeling,
    private readonly factory: TtElementFactory,
    private readonly canvas: Canvas,
  ) {
    commandStack.registerHandler(UPDATE_PROPERTIES, UpdatePropertiesHandler);
  }

  updateProperties(element: TtElement, properties: Record<string, unknown>): void {
    this.commandStack.execute(UPDATE_PROPERTIES, { element, properties });
  }

  /** Rename / relabel any element. */
  updateLabel(element: TtElement, label: string): void {
    this.updateProperties(element, { ttLabel: label || undefined });
  }

  setTeamType(team: TtTeam, teamType: TeamType): void {
    this.updateProperties(team, { teamType });
  }

  setInteractionMode(interaction: TtInteraction, mode: InteractionMode): void {
    this.updateProperties(interaction, { mode });
  }

  /** Set or clear per-element colour overrides (`undefined` reverts to default). */
  setColors(
    element: TtTeam | TtInteraction,
    fill: string | undefined,
    stroke: string | undefined,
  ): void {
    this.updateProperties(element, { fill, stroke });
  }

  setDescription(team: TtTeam, description: string | undefined): void {
    this.updateProperties(team, { description });
  }

  /** Places a new annotation to the upper right of `element`, attached to it, as one undo step. */
  appendAnnotation(element: TtElement): TtAnnotation {
    const annotation = this.factory.createNewAnnotation();
    const position = {
      x: element.x + element.width + ANNOTATION_GAP + annotation.width / 2,
      y: element.y - ANNOTATION_GAP / 4,
    };
    return this.modeling.appendShape(
      element as Element,
      annotation as Element,
      position,
      this.canvas.getRootElement() as Root,
      { connection: this.factory.createNewAssociation(), connectionTarget: element },
    ) as unknown as TtAnnotation;
  }

  /** Removes the annotation's connector; the annotation itself stays. */
  detachAnnotation(annotation: TtAnnotation): void {
    const associations = [...annotation.incoming, ...annotation.outgoing].filter(isTtAssociation);
    if (associations.length > 0) this.modeling.removeElements(associations);
  }
}
