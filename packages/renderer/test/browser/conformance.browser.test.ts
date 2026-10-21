import { afterAll, afterEach, describe, expect, test } from "vitest";
import {
  attachedHost,
  registerConformance,
  type ConformanceHarness,
} from "@miragon/modeler-api/conformance";
import type { CollaborativeModeler } from "@miragon/modeler-api";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type { Root, Shape } from "diagram-js/lib/model/Types";
import {
  createCollaborativeModeler,
  createCollaborativeViewer,
  type CollaborativeTeamTopologiesModeler,
  type Modeler,
  type TtElement,
  type TtElementFactory,
  type TtLabelEditing,
  type TtModeling,
} from "@miragon/team-topologies-renderer";
import onlineShop from "../../../../example/sample.tt?raw";
import rideHailing from "../../../../plugins/team-topologies-modeler/skills/tt-format/examples/ride-hailing.tt?raw";
import onlineShopLoose from "./fixtures/online-shop.loose.tt?raw";
import onlineShopV2 from "./fixtures/online-shop.v2.tt?raw";
import onlineShopForeign from "./fixtures/online-shop.foreign.tt?raw";

const hostWrappers: HTMLElement[] = [];

afterEach(() => {
  for (const wrapper of hostWrappers.splice(0)) wrapper.remove();
});

function mountedHost(): HTMLElement {
  const host = attachedHost();
  if (host.parentElement) hostWrappers.push(host.parentElement);
  return host;
}

function modelerOf(modeler: CollaborativeModeler): Modeler {
  return (modeler as CollaborativeTeamTopologiesModeler).diagram as Modeler;
}

// Shared across instances: every call creates a team with a name of its own, so the kit's
// collision case compares the ids two peers allocate for different teams.
let createdTeams = 0;

function addTeam(modeler: CollaborativeModeler): void {
  const diagram = modelerOf(modeler);
  createdTeams += 1;
  const team = diagram
    .get<TtElementFactory>("ttElementFactory")
    .createNewTeam("stream-aligned", `Payments ${createdTeams}`);
  diagram
    .get<Modeling>("modeling")
    .createShape(
      team as unknown as Shape,
      { x: 1400, y: 700 },
      diagram.get<Canvas>("canvas").getRootElement() as Root,
    );
}

let renamedTitles = 0;

function renameDiagram(modeler: CollaborativeModeler): void {
  renamedTitles += 1;
  modelerOf(modeler).get<TtModeling>("ttModeling").setTitle(`Renamed topology ${renamedTitles}`);
}

function labelEditor(modeler: CollaborativeModeler): HTMLTextAreaElement {
  const field = modelerOf(modeler)
    .get<Canvas>("canvas")
    .getContainer()
    .querySelector<HTMLTextAreaElement>("textarea.tt-label-editor");
  if (!field) throw new Error("no label editor is open");
  return field;
}

/** The canonical sample with `fragment` typed only as far as `typedSoFar`. */
function typedHalfway(fragment: string, typedSoFar: string): string {
  if (!onlineShop.includes(fragment)) throw new Error(`the fixture lost "${fragment}"`);
  return onlineShop.replace(fragment, typedSoFar);
}

function withoutSizeOf(interactionId: string): string {
  const sizeOfInteraction = new RegExp(
    `("id": "${interactionId}",[\\s\\S]*?),\\n\\s*"size": \\{[^}]*\\}`,
  );
  if (!sizeOfInteraction.test(onlineShop)) throw new Error(`the fixture lost "${interactionId}"`);
  return onlineShop.replace(sizeOfInteraction, "$1");
}

const harness: ConformanceHarness = {
  async create() {
    const modeler = createCollaborativeModeler();
    modeler.attachTo(mountedHost());
    return modeler;
  },
  async createReadonly() {
    const viewer = createCollaborativeViewer();
    viewer.attachTo(mountedHost());
    return viewer;
  },
  // Reviewed: the repository's example and a skill example, both written by the checker's
  // canonical form (key order, ids sorted, two decimals, a final line break).
  canonicalTexts: [onlineShop, rideHailing],
  // Hand-authored: drawing order, keys in writing order, off-grid coordinates, no final line
  // break; and a version 2 file without annotations.
  looseTexts: [onlineShopLoose, onlineShopV2],
  invalidTexts: [
    typedHalfway('"type": "platform",', '"type": "platfo'),
    onlineShop.replace('"mode": "collaboration"', '"mode": "handover"'),
    onlineShop.replace('"id": "team_fraud"', '"id": "team_checkout"'),
    onlineShop.replace('"id": "flow_main"', '"id": "tt-root"'),
    onlineShop.replace('"id": "flow_main"', '"id": "assoc_ann_fraud_handover"'),
    onlineShop.replace('"id": "flow_main"', '"id": "constructor"'),
    withoutSizeOf("int_platform_fulfilment"),
  ],
  foreignTexts: [
    {
      text: onlineShopForeign,
      mustSurvive: [
        '"x-vendor": "keep-me"',
        '"x-owner": "team-checkout"',
        '"x-source": {\n        "page": 12,\n        "tool": "wiki"\n      }',
      ],
    },
  ],
  viewState: { x: 120, y: 80, width: 640, height: 480 },
  mutate: addTeam,
  configMutations: [{ name: "title", run: renameDiagram }],
  undo: (modeler) => modelerOf(modeler).undo(),
  redo: (modeler) => modelerOf(modeler).redo(),
  // The label editor reopens one task after an import.
  settle: () => new Promise((resolve) => setTimeout(resolve, 30)),
  // Damaged forms a peer's typing produces, on top of the probes the kit derives.
  probeTexts: [
    typedHalfway('"x": 220,\n        "y": 276', '"x": 220,\n        "y": '),
    typedHalfway('"width": 600,', '"width": 6'),
    typedHalfway('"attachedTo": "int_checkout_fraud"', '"attachedTo": "int_check'),
    typedHalfway('"title": "Online shop team topology",', '"title": "Online shop'),
    "{",
  ],
  moveElement(modeler) {
    const diagram = modelerOf(modeler);
    const team = diagram.get<ElementRegistry>("elementRegistry").get("team_checkout");
    if (!team) throw new Error("the imported diagram has no team_checkout to move");
    diagram.get<Modeling>("modeling").moveElements([team as Shape], { x: 60, y: 40 });
    return team.id;
  },
  openInteraction(modeler) {
    const diagram = modelerOf(modeler);
    const team = diagram.get<ElementRegistry>("elementRegistry").get("team_checkout");
    if (!team) throw new Error("the imported diagram has no team_checkout to edit");
    diagram.get<TtLabelEditing>("ttLabelEditing").activate(team as unknown as TtElement);
    labelEditor(modeler).value = "typed, not committed";
  },
  interactionState(modeler) {
    const edit = modelerOf(modeler).get<TtLabelEditing>("ttLabelEditing").openEdit();
    return edit && { elementId: edit.elementId, text: edit.value };
  },
  // Enter in the field, as a user commits the label.
  commitInteraction(modeler) {
    labelEditor(modeler).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
  },
};

// The harness fills every optional hook, and the kit takes an explicit [] as a declaration, so a
// skip is a gap of this harness.
const failOnSkip = {
  onSkip(caseName: string, reason: string): never {
    throw new Error(`conformance case skipped: "${caseName}" — ${reason}`);
  },
};

const advisories: string[] = [];

describe("Team Topologies implements the collaborative-modeler contract", () => {
  registerConformance(harness, test, {
    ...failOnSkip,
    onAdvisory(caseName, advice) {
      advisories.push(`${caseName}: ${advice}`);
    },
  });

  // Ids are random (team_<nanoid>), and an edit open during a re-import comes back: nothing the
  // contract only recommends is left to advise.
  afterAll(() => {
    expect(advisories).toEqual([]);
  });
});
