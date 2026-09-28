/**
 * Lays every annotation connector out as a straight line between the centres of
 * the annotation and its element (the association behaviour then crops it to
 * both outlines). The anchor hints from move / resize / connect are ignored on
 * purpose, so the connector never drifts off-centre.
 */

import BaseLayouter, { type LayoutConnectionHints } from "diagram-js/lib/layout/BaseLayouter";
import { getMid } from "diagram-js/lib/layout/LayoutUtil";
import type { Connection } from "diagram-js/lib/model/Types";
import type { Point } from "diagram-js/lib/util/Types";

export default class TtLayouter extends BaseLayouter {
  override layoutConnection(connection: Connection, hints: LayoutConnectionHints = {}): Point[] {
    const source = hints.source ?? connection.source;
    const target = hints.target ?? connection.target;
    if (!source || !target) return super.layoutConnection(connection, hints);
    return [getMid(source), getMid(target)];
  }
}
