/**
 * Keeps the diagram flat: Team Topologies shapes overlap but never nest.
 *
 * diagram-js parents a newly created shape to whatever element it is dropped on
 * (`context.parent` defaults to the drop target). Interaction glyphs are meant
 * to be placed *over* the teams they relate to, so the natural workflow would
 * otherwise nest the interaction inside a team — gluing it so it moves along
 * with the team. Force every created shape onto the diagram root instead.
 *
 * Re-parenting on *move* is prevented separately in TtRules.
 */

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import type EventBus from "diagram-js/lib/core/EventBus";
import type Canvas from "diagram-js/lib/core/Canvas";

export default class TtFlatModelBehavior extends CommandInterceptor {
  static override $inject = ["eventBus", "canvas"];

  constructor(eventBus: EventBus, canvas: Canvas) {
    super(eventBus);

    this.preExecute(
      ["shape.create", "elements.create"],
      (context: { parent?: unknown }) => {
        context.parent = canvas.getRootElement();
      },
      true,
    );
  }
}
