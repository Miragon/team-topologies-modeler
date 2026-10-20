import { DIAGRAM_ROOT_ID, type ForeignFields } from "@miragon/team-topologies-schema-model";

/** ID of the diagram-js root element holding the Team Topologies diagram. */
export const ROOT_ID = DIAGRAM_ROOT_ID;

export interface ImportWarning {
  readonly message: string;
  readonly elementId?: string;
}

/** Diagram-level metadata stashed on the root element. */
export interface RootBusinessObject {
  title: string;
  /** Document fields the modeler does not know, written back on export. */
  foreign?: ForeignFields;
}
