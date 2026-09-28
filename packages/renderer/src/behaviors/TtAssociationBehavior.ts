/**
 * Keeps annotation connectors tidy while editing:
 *  - crops every laid-out connector to the outlines of the two shapes it joins
 *    (the layouter only knows their centres);
 *  - an annotation is attached to at most one element (the document stores a
 *    single `attachedTo`), so connecting it again replaces the old connector.
 */

import CommandInterceptor from "diagram-js/lib/command/CommandInterceptor";
import type EventBus from "diagram-js/lib/core/EventBus";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type ConnectionDocking from "diagram-js/lib/layout/ConnectionDocking";
import type { Connection } from "diagram-js/lib/model/Types";
import { isTtAnnotation, isTtAssociation } from "../model/di-types.js";

interface ConnectionContext {
  connection: Connection;
  cropped?: boolean;
}

export default class TtAssociationBehavior extends CommandInterceptor {
  static override $inject = ["eventBus", "connectionDocking", "modeling"];

  constructor(eventBus: EventBus, connectionDocking: ConnectionDocking, modeling: Modeling) {
    super(eventBus);

    this.executed(
      ["connection.layout", "connection.create"],
      (context: ConnectionContext) => {
        if (context.cropped || !isTtAssociation(context.connection)) return;
        context.connection.waypoints = connectionDocking.getCroppedWaypoints(context.connection);
        context.cropped = true;
      },
      true,
    );

    this.reverted(
      "connection.layout",
      (context: ConnectionContext) => {
        delete context.cropped;
      },
      true,
    );

    this.postExecuted(
      "connection.create",
      (context: ConnectionContext) => {
        const connection = context.connection;
        if (!isTtAssociation(connection)) return;
        const annotation = isTtAnnotation(connection.source)
          ? connection.source
          : connection.target;
        if (!isTtAnnotation(annotation)) return;
        const previous = [...annotation.incoming, ...annotation.outgoing].filter(
          (other) => other !== connection && isTtAssociation(other),
        );
        if (previous.length > 0) modeling.removeElements(previous);
      },
      true,
    );
  }
}
