/**
 * High-level Team Topologies mutations that go through the command stack
 * (undo/redo). Registers the generic property command handler.
 */

import type CommandStack from "diagram-js/lib/command/CommandStack";
import type { InteractionMode, TeamType } from "@tt-modeler/schema-model";
import type { TtElement, TtInteraction, TtTeam } from "../model/di-types.js";
import UpdatePropertiesHandler from "./cmd/UpdatePropertiesHandler.js";

const UPDATE_PROPERTIES = "element.updateProperties";

export default class TtModeling {
  static $inject = ["commandStack"];

  constructor(private readonly commandStack: CommandStack) {
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
}
