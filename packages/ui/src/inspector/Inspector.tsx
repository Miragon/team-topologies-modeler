/**
 * Floating inspector: a panel on the right below the top row (a bottom sheet on narrow screens).
 * It edits the one selected element (a team, an interaction, the flow of change or an annotation)
 * through the modeler's modeling services, so every change is one undo step. A multi-selection
 * gets a short summary with a delete action instead.
 */

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Trash, X } from "lucide-react";
import {
  INTERACTION_MODES,
  INTERACTION_MODE_SPECS,
  TEAM_TYPES,
  TEAM_TYPE_SPECS,
  type InteractionMode,
  type TeamType,
} from "@miragon/team-topologies-schema-model";
import type {
  Modeler,
  TtAnnotation,
  TtElement,
  TtFlow,
  TtInteraction,
  TtModeling,
  TtTeam,
} from "@miragon/team-topologies-renderer";
import {
  isTtAnnotation,
  isTtAssociation,
  isTtElement,
  isTtFlow,
  isTtInteraction,
  isTtTeam,
} from "@miragon/team-topologies-renderer";
import type Canvas from "diagram-js/lib/core/Canvas";
import type Selection from "diagram-js/lib/features/selection/Selection";
import type { Element } from "diagram-js/lib/model/Types";
import { getBBox } from "diagram-js/lib/util/Elements";
import { CommitInput } from "../CommitInput";
import { Icon } from "../Icon";
import { AnnotationIcon, FlowIcon, InteractionIcon, TeamIcon } from "../ShapeIcon";
import { ColorField } from "./ColorField";
import { useKeepSelectionVisible, type SelectionArea } from "./keepSelectionVisible";

interface Modeling {
  removeElements(elements: Element[]): void;
}

interface InspectorServices {
  ttModeling: TtModeling;
  removeAndFocusCanvas: (elements: Element[]) => void;
  closeAndFocusCanvas: () => void;
}

function inspectorServices(modeler: Modeler): InspectorServices {
  const canvas = modeler.get<Canvas>("canvas");
  return {
    ttModeling: modeler.get<TtModeling>("ttModeling"),
    /** The panel unmounts with the selection, so keyboard focus moves on to the canvas. */
    removeAndFocusCanvas: (elements: Element[]) => {
      modeler.get<Modeling>("modeling").removeElements(elements);
      canvas.focus();
    },
    closeAndFocusCanvas: () => {
      modeler.get<Selection>("selection").select(null);
      canvas.focus();
    },
  };
}

function PanelHeader({
  icon,
  title,
  onClose,
}: {
  icon?: ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="tt-inspector__head">
      <h2 className="tt-inspector__header">
        {icon}
        <span>{title}</span>
      </h2>
      <button
        type="button"
        className="tt-closebtn"
        aria-label="Close"
        title="Close (Esc)"
        onClick={onClose}
      >
        <Icon icon={X} />
      </button>
    </div>
  );
}

/**
 * Holds every control that changes the diagram, so a read-only panel disables them in one place
 * while its Close button keeps working.
 */
function InspectorFields({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  return (
    <fieldset className="tt-inspector__fields" disabled={readOnly}>
      {children}
    </fieldset>
  );
}

function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button type="button" className="tt-btn tt-btn--danger tt-inspector__delete" onClick={onDelete}>
      <Icon icon={Trash} />
      {label}
    </button>
  );
}

interface PanelProps {
  services: InspectorServices;
  readOnly: boolean;
}

function TeamInspector({ team, services, readOnly }: PanelProps & { team: TtTeam }) {
  const { ttModeling, removeAndFocusCanvas, closeAndFocusCanvas } = services;
  const type = team.teamType;
  const spec = TEAM_TYPE_SPECS[type];

  return (
    <div className="tt-inspector__content" key={team.id}>
      <PanelHeader icon={<TeamIcon type={type} />} title="Team" onClose={closeAndFocusCanvas} />

      <InspectorFields readOnly={readOnly}>
        <label className="tt-field">
          <span className="tt-field__label">Team type</span>
          <select
            className="tt-field__control"
            value={type}
            onChange={(e) => ttModeling.setTeamType(team, e.target.value as TeamType)}
          >
            {TEAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {TEAM_TYPE_SPECS[t].label}
              </option>
            ))}
          </select>
        </label>

        <p className="tt-inspector__meta">{spec.description}</p>

        <label className="tt-field">
          <span className="tt-field__label">Name</span>
          <CommitInput
            value={team.ttLabel ?? ""}
            placeholder="Team name"
            onCommit={(label) => ttModeling.updateLabel(team, label.trim())}
          />
        </label>

        <label className="tt-field">
          <span className="tt-field__label">Description</span>
          <CommitInput
            value={team.description ?? ""}
            multiline
            placeholder="Purpose, ownership, notes…"
            onCommit={(description) =>
              ttModeling.setDescription(team, description.trim() || undefined)
            }
          />
        </label>

        <div className="tt-field tt-field--row">
          <ColorField
            label="Fill"
            value={team.fill ?? spec.fill}
            onCommit={(fill) => ttModeling.setColors(team, fill, team.stroke)}
          />
          <ColorField
            label="Outline"
            value={team.stroke ?? spec.stroke}
            onCommit={(stroke) => ttModeling.setColors(team, team.fill, stroke)}
          />
          {(team.fill || team.stroke) && (
            <button
              type="button"
              className="tt-btn tt-btn--ghost tt-btn--sm"
              onClick={() => ttModeling.setColors(team, undefined, undefined)}
            >
              Reset colours
            </button>
          )}
        </div>

        <p className="tt-inspector__meta">Drag a corner to show the team’s cognitive load.</p>

        <DeleteButton label="Delete team" onDelete={() => removeAndFocusCanvas([team])} />
      </InspectorFields>
    </div>
  );
}

function InteractionInspector({
  interaction,
  services,
  readOnly,
}: PanelProps & { interaction: TtInteraction }) {
  const { ttModeling, removeAndFocusCanvas, closeAndFocusCanvas } = services;
  const mode = interaction.mode;
  const spec = INTERACTION_MODE_SPECS[mode];

  return (
    <div className="tt-inspector__content" key={interaction.id}>
      <PanelHeader
        icon={<InteractionIcon mode={mode} />}
        title="Interaction"
        onClose={closeAndFocusCanvas}
      />

      <InspectorFields readOnly={readOnly}>
        <label className="tt-field">
          <span className="tt-field__label">Interaction mode</span>
          <select
            className="tt-field__control"
            value={mode}
            onChange={(e) =>
              ttModeling.setInteractionMode(interaction, e.target.value as InteractionMode)
            }
          >
            {INTERACTION_MODES.map((m) => (
              <option key={m} value={m}>
                {INTERACTION_MODE_SPECS[m].label}
              </option>
            ))}
          </select>
        </label>

        <p className="tt-inspector__meta">{spec.description}</p>

        <label className="tt-field">
          <span className="tt-field__label">Label</span>
          <CommitInput
            value={interaction.ttLabel ?? ""}
            placeholder="What is provided or discovered"
            onCommit={(label) => ttModeling.updateLabel(interaction, label.trim())}
          />
        </label>

        <p className="tt-inspector__meta">Place it over the teams it connects.</p>

        <DeleteButton
          label="Delete interaction"
          onDelete={() => removeAndFocusCanvas([interaction])}
        />
      </InspectorFields>
    </div>
  );
}

function FlowInspector({ flow, services, readOnly }: PanelProps & { flow: TtFlow }) {
  const { ttModeling, removeAndFocusCanvas, closeAndFocusCanvas } = services;

  return (
    <div className="tt-inspector__content" key={flow.id}>
      <PanelHeader icon={<FlowIcon />} title="Flow of change" onClose={closeAndFocusCanvas} />

      <InspectorFields readOnly={readOnly}>
        <p className="tt-inspector__meta">
          The left-to-right flow of change. Add several to group different teams or models on one
          canvas.
        </p>

        <label className="tt-field">
          <span className="tt-field__label">Label</span>
          <CommitInput
            value={flow.ttLabel ?? ""}
            placeholder="Flow of change"
            onCommit={(label) => ttModeling.updateLabel(flow, label.trim())}
          />
        </label>

        <p className="tt-inspector__meta">Stretch it across the whole diagram.</p>

        <DeleteButton label="Delete flow of change" onDelete={() => removeAndFocusCanvas([flow])} />
      </InspectorFields>
    </div>
  );
}

/** The element an annotation's connector points at, if it is attached. */
function attachedElement(annotation: TtAnnotation): TtElement | undefined {
  const association = [...annotation.outgoing, ...annotation.incoming].find(isTtAssociation);
  if (!association) return undefined;
  const other = association.source === annotation ? association.target : association.source;
  return isTtElement(other) ? other : undefined;
}

function describe(element: TtElement): string {
  if (isTtTeam(element))
    return element.ttLabel || `${TEAM_TYPE_SPECS[element.teamType].label} team`;
  if (isTtInteraction(element))
    return element.ttLabel || INTERACTION_MODE_SPECS[element.mode].label;
  return element.ttLabel || "Flow of change";
}

function AnnotationInspector({
  annotation,
  services,
  readOnly,
}: PanelProps & { annotation: TtAnnotation }) {
  const { ttModeling, removeAndFocusCanvas, closeAndFocusCanvas } = services;
  const target = attachedElement(annotation);

  return (
    <div className="tt-inspector__content" key={annotation.id}>
      <PanelHeader icon={<AnnotationIcon />} title="Annotation" onClose={closeAndFocusCanvas} />

      <InspectorFields readOnly={readOnly}>
        <label className="tt-field">
          <span className="tt-field__label">Text</span>
          <CommitInput
            value={annotation.ttLabel ?? ""}
            multiline
            placeholder="Rationale, open question, planned change…"
            onCommit={(text) => ttModeling.updateLabel(annotation, text.trim())}
          />
        </label>

        {target ? (
          <div className="tt-inspector__attachment">
            <p className="tt-inspector__meta">Attached to “{describe(target)}”.</p>
            <button
              type="button"
              className="tt-btn tt-btn--ghost tt-btn--sm"
              onClick={() => ttModeling.detachAnnotation(annotation)}
            >
              Detach
            </button>
          </div>
        ) : (
          <p className="tt-inspector__meta">
            Not attached. Choose “Attach to element” next to it to connect it to a team, an
            interaction or a flow of change.
          </p>
        )}

        <DeleteButton
          label="Delete annotation"
          onDelete={() => removeAndFocusCanvas([annotation])}
        />
      </InspectorFields>
    </div>
  );
}

function MultiInspector({ elements, services, readOnly }: PanelProps & { elements: Element[] }) {
  const { removeAndFocusCanvas, closeAndFocusCanvas } = services;
  const count = elements.length;

  return (
    <div className="tt-inspector__content">
      <PanelHeader title={`${count} elements selected`} onClose={closeAndFocusCanvas} />
      <InspectorFields readOnly={readOnly}>
        <p className="tt-inspector__meta">Drag them or use the arrow keys to move them together.</p>
        <DeleteButton
          label={`Delete ${count} elements`}
          onDelete={() => removeAndFocusCanvas(elements)}
        />
      </InspectorFields>
    </div>
  );
}

/** Everything that is selected, including connectors, kept in step with the canvas. */
function useSelectedElements(modeler: Modeler): Element[] {
  const [elements, setElements] = useState<Element[]>([]);
  useEffect(() => {
    const selection = modeler.get<Selection>("selection");
    const sync = () => setElements([...selection.get()]);
    modeler.on("selection.changed", sync);
    sync();
    return () => modeler.off("selection.changed", sync);
  }, [modeler]);
  return elements;
}

function boundsOf(elements: Element[]): SelectionArea {
  return { id: elements.map((element) => element.id).join(" "), ...getBBox(elements) };
}

/**
 * When the panel's content goes away under keyboard focus (an undo or a change to the file removed
 * the element), focus falls back to the page. The canvas takes it, so its keyboard keeps working.
 * Only while this document has focus: a change typed in another editor must not pull focus here.
 */
function useCanvasCatchesDroppedFocus(modeler: Modeler, contentKey: string | null) {
  const shownKey = useRef(contentKey);
  useEffect(() => {
    if (shownKey.current === contentKey) return;
    const hadContent = shownKey.current !== null;
    shownKey.current = contentKey;
    if (!hadContent || document.activeElement !== document.body || !document.hasFocus()) return;
    modeler.get<Canvas>("canvas").restoreFocus();
  }, [modeler, contentKey]);
}

export interface InspectorProps {
  /** The modeler whose selection the panel edits. */
  modeler: Modeler;
  /** The one selected element; null for none or several (a multi-selection is read from the modeler). */
  selected: TtElement | null;
  /** Bumped on every model change, so the panel re-reads the live props of the selected element. */
  revision: number;
  /** Shows the values but disables every control that changes them, e.g. while the host can't save. */
  readOnly?: boolean;
}

export function Inspector({ modeler, selected, revision, readOnly = false }: InspectorProps) {
  // `revision` is read so the inspector re-renders when the selected element mutates.
  void revision;
  const selectedElements = useSelectedElements(modeler);
  const panelRef = useRef<HTMLElement>(null);
  const isMultiSelection = selectedElements.length > 1;
  const services = inspectorServices(modeler);
  const multiSelectionBounds = isMultiSelection ? boundsOf(selectedElements) : null;
  const shownArea = multiSelectionBounds ?? selected;

  useKeepSelectionVisible(modeler, shownArea, panelRef);
  useCanvasCatchesDroppedFocus(modeler, shownArea?.id ?? null);

  const panelProps = { services, readOnly };
  let body: ReactNode;
  if (isMultiSelection) {
    body = <MultiInspector elements={selectedElements} {...panelProps} />;
  } else if (isTtTeam(selected)) {
    body = <TeamInspector team={selected} {...panelProps} />;
  } else if (isTtInteraction(selected)) {
    body = <InteractionInspector interaction={selected} {...panelProps} />;
  } else if (isTtFlow(selected)) {
    body = <FlowInspector flow={selected} {...panelProps} />;
  } else if (isTtAnnotation(selected)) {
    body = <AnnotationInspector annotation={selected} {...panelProps} />;
  } else {
    return null;
  }

  // Escape that a field didn't use (to undo its draft) closes the panel, like it does on the canvas.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    services.closeAndFocusCanvas();
  };

  return (
    <aside className="tt-inspector" aria-label="Properties" ref={panelRef} onKeyDown={onKeyDown}>
      {body}
    </aside>
  );
}
