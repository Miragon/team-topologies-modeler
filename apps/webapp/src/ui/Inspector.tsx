/**
 * Floating inspector (top-right of the canvas). Appears only while exactly one
 * element is selected — a team, an interaction glyph or the flow arrow — editing
 * it through the modeler's modeling services (every change is undoable).
 */

import {
  INTERACTION_MODES,
  INTERACTION_MODE_SPECS,
  TEAM_TYPES,
  TEAM_TYPE_SPECS,
  type InteractionMode,
  type TeamType,
} from "@miragon/team-topologies-schema-model";
import type { TtFlow, TtInteraction, TtModeling, TtTeam } from "@miragon/team-topologies-renderer";
import { isTtFlow, isTtInteraction, isTtTeam } from "@miragon/team-topologies-renderer";
import { useModeler } from "@/state/modelerContext";
import { CommitInput } from "./CommitInput";
import { InteractionIcon, TeamIcon } from "./ShapeIcon";

interface Modeling {
  removeElements(elements: unknown[]): void;
}

function useServices() {
  const { modeler } = useModeler();
  return {
    ttModeling: modeler.get<TtModeling>("ttModeling"),
    modeling: modeler.get<Modeling>("modeling"),
  };
}

function SizeHint({ w, h, note }: { w: number; h: number; note: string }) {
  return (
    <p className="tt-inspector__meta">
      Size {Math.round(w)}×{Math.round(h)}px · {note}
    </p>
  );
}

function TeamInspector({ team }: { team: TtTeam }) {
  const { ttModeling, modeling } = useServices();
  const type = team.teamType;
  const spec = TEAM_TYPE_SPECS[type];

  return (
    <div className="tt-inspector__content" key={team.id}>
      <header className="tt-inspector__header">
        <TeamIcon type={type} />
        <span>{spec.label} team</span>
      </header>

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

      <label className="tt-field">
        <span className="tt-field__label">Name</span>
        <CommitInput
          value={team.ttLabel ?? ""}
          ariaLabel="Team name"
          onCommit={(label) => {
            const next = label.trim();
            if (next) ttModeling.updateLabel(team, next);
          }}
        />
      </label>

      <label className="tt-field">
        <span className="tt-field__label">Description</span>
        <CommitInput
          value={team.description ?? ""}
          multiline
          placeholder="Purpose, ownership, notes…"
          ariaLabel="Team description"
          onCommit={(description) => ttModeling.setDescription(team, description || undefined)}
        />
      </label>

      <div className="tt-field tt-field--row">
        <label className="tt-field__color">
          <span className="tt-field__label">Fill</span>
          <input
            type="color"
            value={team.fill ?? spec.fill}
            onChange={(e) => ttModeling.setColors(team, e.target.value, team.stroke)}
          />
        </label>
        <label className="tt-field__color">
          <span className="tt-field__label">Outline</span>
          <input
            type="color"
            value={team.stroke ?? spec.stroke}
            onChange={(e) => ttModeling.setColors(team, team.fill, e.target.value)}
          />
        </label>
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

      <SizeHint w={team.width} h={team.height} note="drag a corner to express cognitive load." />

      <button
        type="button"
        className="tt-btn tt-btn--danger"
        onClick={() => modeling.removeElements([team])}
      >
        Delete team
      </button>
    </div>
  );
}

function InteractionInspector({ interaction }: { interaction: TtInteraction }) {
  const { ttModeling, modeling } = useServices();
  const mode = interaction.mode;
  const spec = INTERACTION_MODE_SPECS[mode];

  return (
    <div className="tt-inspector__content" key={interaction.id}>
      <header className="tt-inspector__header">
        <InteractionIcon mode={mode} />
        <span>{spec.label}</span>
      </header>

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
          placeholder="e.g. what is provided / discovered"
          ariaLabel="Interaction label"
          onCommit={(label) => ttModeling.updateLabel(interaction, label.trim())}
        />
      </label>

      <SizeHint
        w={interaction.width}
        h={interaction.height}
        note="place it over the teams it relates to."
      />

      <button
        type="button"
        className="tt-btn tt-btn--danger"
        onClick={() => modeling.removeElements([interaction])}
      >
        Delete interaction
      </button>
    </div>
  );
}

function FlowInspector({ flow }: { flow: TtFlow }) {
  const { ttModeling, modeling } = useServices();

  return (
    <div className="tt-inspector__content" key={flow.id}>
      <header className="tt-inspector__header">
        <span>Flow of change</span>
      </header>

      <p className="tt-inspector__meta">
        The implied left-to-right flow. Place several to group different teams or models on one
        canvas.
      </p>

      <label className="tt-field">
        <span className="tt-field__label">Label</span>
        <CommitInput
          value={flow.ttLabel ?? ""}
          placeholder="Flow of change"
          ariaLabel="Flow label"
          onCommit={(label) => ttModeling.updateLabel(flow, label.trim())}
        />
      </label>

      <SizeHint w={flow.width} h={flow.height} note="resize to span your diagram." />

      <button
        type="button"
        className="tt-btn tt-btn--danger"
        onClick={() => modeling.removeElements([flow])}
      >
        Delete flow
      </button>
    </div>
  );
}

export function Inspector() {
  // `revision` is read so the inspector re-renders when the selected element mutates.
  const { selected, revision } = useModeler();
  void revision;

  let body: React.ReactNode;
  if (isTtTeam(selected)) {
    body = <TeamInspector team={selected} />;
  } else if (isTtInteraction(selected)) {
    body = <InteractionInspector interaction={selected} />;
  } else if (isTtFlow(selected)) {
    body = <FlowInspector flow={selected} />;
  } else {
    return null;
  }

  return (
    <aside className="tt-inspector" aria-label="Inspector">
      {body}
    </aside>
  );
}
