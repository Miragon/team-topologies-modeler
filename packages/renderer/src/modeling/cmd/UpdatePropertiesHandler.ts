/**
 * Generic, undo-able command that sets arbitrary Team Topologies properties
 * (ttLabel, teamType, mode, fill, stroke, description). Returns the changed
 * element so the CommandStack fires `elements.changed` → re-render.
 */

import type { ElementLike } from "diagram-js/lib/core/Types";
import type CommandHandler from "diagram-js/lib/command/CommandHandler";

export interface UpdatePropertiesContext {
  element: ElementLike & Record<string, unknown>;
  properties: Record<string, unknown>;
  /** set internally by the handler (for revert). */
  oldProperties?: Record<string, unknown>;
}

function setOrDelete(obj: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined) delete obj[key];
  else obj[key] = value;
}

export default class UpdatePropertiesHandler implements CommandHandler {
  execute(context: UpdatePropertiesContext): ElementLike[] {
    const { element, properties } = context;
    const target = element as unknown as Record<string, unknown>;
    const old: Record<string, unknown> = {};
    for (const key of Object.keys(properties)) {
      old[key] = target[key];
      setOrDelete(target, key, properties[key]);
    }
    context.oldProperties = old;
    return [element];
  }

  revert(context: UpdatePropertiesContext): ElementLike[] {
    const { element, oldProperties } = context;
    const target = element as unknown as Record<string, unknown>;
    if (oldProperties) {
      for (const key of Object.keys(oldProperties)) setOrDelete(target, key, oldProperties[key]);
    }
    return [element];
  }
}
