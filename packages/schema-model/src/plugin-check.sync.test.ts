/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ANNOTATION_SPEC, FLOW_SPEC, INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS } from "./notation";
import { SAMPLE_DOCUMENT } from "./sample";
import { parseDocument } from "./schema";
import { serializeDocument } from "./serialize";
import { DOCUMENT_VERSION, INTERACTION_MODES, TEAM_TYPES } from "./types";
import type { Size, TtDocument } from "./types";

/**
 * Drift guard: the Claude Code plugin ships a dependency-free checker
 * (`plugins/team-topologies-modeler/skills/tt-format/scripts/check.mjs`) that hand-mirrors the
 * notation sizes, the Zod schema and the deterministic serializer of this package, so agents can
 * validate and canonicalize `.tt` files anywhere. This test fails as soon as the two diverge.
 */

interface NotationEntry {
  label: string;
  defaultSize: Size;
  minSize: Size;
}

interface Finding {
  path: string;
  message: string;
}

interface CheckerModule {
  DOCUMENT_VERSION: number;
  TEAM_TYPES: Record<string, NotationEntry>;
  INTERACTION_MODES: Record<string, NotationEntry>;
  FLOW: NotationEntry;
  ANNOTATION: NotationEntry;
  checkDocument(input: unknown): { errors: Finding[]; warnings: Finding[]; readings: string[] };
  formatDocument(input: unknown): string;
}

const skillDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../plugins/team-topologies-modeler/skills/tt-format",
);
const checkerPath = join(skillDirectory, "scripts/check.mjs");
const examplesDirectory = join(skillDirectory, "examples");
const checker = (await import(pathToFileURL(checkerPath).href)) as CheckerModule;

const notationEntry = ({ label, defaultSize, minSize }: NotationEntry): NotationEntry => ({
  label,
  defaultSize,
  minSize,
});

function sampleCopy(): TtDocument {
  return structuredClone(SAMPLE_DOCUMENT);
}

describe("plugin checker ↔ schema-model", () => {
  it("mirrors the notation", () => {
    expect(checker.DOCUMENT_VERSION).toBe(DOCUMENT_VERSION);
    expect(Object.keys(checker.TEAM_TYPES).sort()).toEqual([...TEAM_TYPES].sort());
    expect(Object.keys(checker.INTERACTION_MODES).sort()).toEqual([...INTERACTION_MODES].sort());
    for (const type of TEAM_TYPES) {
      expect(checker.TEAM_TYPES[type]).toEqual(notationEntry(TEAM_TYPE_SPECS[type]));
    }
    for (const mode of INTERACTION_MODES) {
      expect(checker.INTERACTION_MODES[mode]).toEqual(notationEntry(INTERACTION_MODE_SPECS[mode]));
    }
    expect(checker.FLOW).toEqual(notationEntry(FLOW_SPEC));
    expect(checker.ANNOTATION).toEqual(notationEntry(ANNOTATION_SPEC));
  });

  it("formats exactly like serializeDocument", () => {
    const scrambled = sampleCopy();
    scrambled.nodes.reverse();
    scrambled.interactions.reverse();
    scrambled.nodes[0]!.position.x += 0.004;
    scrambled.nodes[1]!.size.width += 0.126;
    scrambled.nodes[2]!.description = "";
    scrambled.interactions[0]!.label = "";
    const { version, title, nodes, interactions, flows, annotations } = scrambled;
    const keysReordered = { annotations, flows, interactions, nodes, title, version };

    expect(checker.formatDocument(keysReordered)).toBe(serializeDocument(scrambled));

    const withoutAnnotations = { ...sampleCopy(), annotations: [] };
    expect(checker.formatDocument(withoutAnnotations)).toBe(serializeDocument(withoutAnnotations));
  });

  it("accepts the sample without findings", () => {
    const result = checker.checkDocument(JSON.parse(serializeDocument(SAMPLE_DOCUMENT)));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  const invalidDocuments: Record<string, (document: Record<string, unknown>) => void> = {
    "an unknown team type": (document) => {
      (document.nodes as Record<string, unknown>[])[0]!.type = "component";
    },
    "a colour name instead of hex": (document) => {
      (document.nodes as Record<string, unknown>[])[0]!.fill = "red";
    },
    "a zero width": (document) => {
      (document.nodes as { size: Size }[])[0]!.size.width = 0;
    },
    "an empty id": (document) => {
      (document.flows as Record<string, unknown>[])[0]!.id = "";
    },
    "a missing team label": (document) => {
      delete (document.nodes as Record<string, unknown>[])[0]!.label;
    },
    "an unknown interaction mode": (document) => {
      (document.interactions as Record<string, unknown>[])[0]!.mode = "handover";
    },
    "a non-string annotation text": (document) => {
      (document.annotations as Record<string, unknown>[])[0]!.text = 42;
    },
    "a non-numeric position": (document) => {
      (document.interactions as { position: Record<string, unknown> }[])[0]!.position.y = "10";
    },
  };

  for (const [name, breakDocument] of Object.entries(invalidDocuments)) {
    it(`rejects ${name} like parseDocument does`, () => {
      const document = JSON.parse(serializeDocument(SAMPLE_DOCUMENT)) as Record<string, unknown>;
      breakDocument(document);
      expect(parseDocument(document).ok).toBe(false);
      expect(checker.checkDocument(document).errors).not.toEqual([]);
    });
  }

  for (const exampleFile of readdirSync(examplesDirectory)) {
    it(`ships ${exampleFile} valid, clean and canonical`, () => {
      const text = readFileSync(join(examplesDirectory, exampleFile), "utf8");
      const parsed = parseDocument(JSON.parse(text));
      if (!parsed.ok) throw new Error(parsed.error);
      expect(text).toBe(`${serializeDocument(parsed.document)}\n`);
      const result = checker.checkDocument(JSON.parse(text));
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  }

  it("accepts the optional fields parseDocument accepts", () => {
    const document = sampleCopy();
    document.nodes[0]!.fill = "#abc";
    document.nodes[0]!.stroke = "#A1B2C3";
    document.interactions[0]!.label = "API";
    expect(parseDocument(document).ok).toBe(true);
    expect(checker.checkDocument(document).errors).toEqual([]);
  });
});

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TestTeam {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  size: Size;
}

interface TestInteraction {
  id: string;
  mode: string;
  label?: string;
  position: { x: number; y: number };
  size: Size;
}

interface TestTopology {
  version: number;
  title: string;
  nodes: TestTeam[];
  interactions: TestInteraction[];
  flows: [];
  annotations: [];
}

const team = (id: string, type: string, label: string, bounds: Bounds): TestTeam => ({
  id,
  type,
  label,
  position: { x: bounds.x, y: bounds.y },
  size: { width: bounds.width, height: bounds.height },
});

const interaction = (id: string, mode: string, bounds: Bounds): TestInteraction => ({
  id,
  mode,
  position: { x: bounds.x, y: bounds.y },
  size: { width: bounds.width, height: bounds.height },
});

const topology = (nodes: TestTeam[], interactions: TestInteraction[] = []): TestTopology => ({
  version: DOCUMENT_VERSION,
  title: "Test topology",
  nodes,
  interactions,
  flows: [],
  annotations: [],
});

const LANE = { width: 600, height: 96 };
const TRIANGLE = { width: 88, height: 78 };

function nodeById(document: TestTopology, id: string): TestTeam {
  const node = document.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`no node ${id}`);
  return node;
}

function stackedLanes(): TestTopology {
  return topology(
    [
      team("team_discovery", "stream-aligned", "Product Discovery", { x: 220, y: 150, ...LANE }),
      team("team_checkout", "stream-aligned", "Checkout & Payments", { x: 220, y: 276, ...LANE }),
      team("team_fulfilment", "stream-aligned", "Order Fulfilment", { x: 220, y: 402, ...LANE }),
      team("team_platform", "platform", "Cloud Platform", {
        x: 220,
        y: 552,
        width: 600,
        height: 110,
      }),
    ],
    [interaction("int_platform_fulfilment", "x-as-a-service", { x: 476, y: 486, ...TRIANGLE })],
  );
}

const serviceReadings = (document: TestTopology): string[] =>
  checker
    .checkDocument(document)
    .readings.filter((reading) => reading.startsWith("x-as-a-service"));

const handOffWarnings = (document: TestTopology): Finding[] =>
  checker.checkDocument(document).warnings.filter(({ message }) => message.includes("hand-off"));

const handOffMessage = (left: string, right: string): string =>
  `"${left}" and "${right}" sit one after the other along the flow of change (side by side or staggered); that reads as a hand-off — stack stream-aligned teams as parallel lanes, one below the other`;

describe("plugin checker: a platform under stacked stream-aligned lanes", () => {
  it("serves every lane of the stack through the one triangle, bottom-up", () => {
    const document = stackedLanes();
    const result = checker.checkDocument(document);
    expect(result.warnings).toEqual([]);
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (stacked above "Order Fulfilment")',
      'x-as-a-service  "Cloud Platform" → "Product Discovery"  (stacked above "Order Fulfilment")',
    ]);
  });

  it("reads the sample's platform as serving all three lanes", () => {
    const result = checker.checkDocument(JSON.parse(serializeDocument(SAMPLE_DOCUMENT)));
    expect(result.readings.filter((reading) => reading.startsWith("x-as-a-service"))).toEqual([
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (stacked above "Order Fulfilment")',
      'x-as-a-service  "Cloud Platform" → "Product Discovery"  (stacked above "Order Fulfilment")',
    ]);
  });

  it("carries the triangle's label to the stacked lanes", () => {
    const document = stackedLanes();
    document.interactions[0]!.label = "CI/CD";
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"  (CI/CD)',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (CI/CD; stacked above "Order Fulfilment")',
      'x-as-a-service  "Cloud Platform" → "Product Discovery"  (CI/CD; stacked above "Order Fulfilment")',
    ]);
  });

  it("keeps walking across an interaction glyph between two lanes", () => {
    const document = stackedLanes();
    document.interactions.push(
      interaction("int_discovery_checkout", "collaboration", {
        x: 464,
        y: 225,
        width: 112,
        height: 72,
      }),
    );
    expect(serviceReadings(document)).toHaveLength(3);
  });

  it("keeps walking inside a grouping drawn around the whole stack", () => {
    const document = stackedLanes();
    document.nodes.push(
      team("grp_shop", "stream-aligned", "Shop", { x: 200, y: 130, width: 640, height: 378 }),
    );
    expect(serviceReadings(document)).toHaveLength(3);
  });

  it("stops at a gap too large for one stack", () => {
    const document = stackedLanes();
    nodeById(document, "team_discovery").position.y = 276 - 90 - 96;
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (stacked above "Order Fulfilment")',
    ]);
    expect(handOffWarnings(document)).toEqual([]);
  });

  it("serves every lane of several areas kept in one stack 60 px apart", () => {
    const document = stackedLanes();
    nodeById(document, "team_fulfilment").position.y = 372 + 60;
    nodeById(document, "team_platform").position.y = 372 + 60 + 96 + 54;
    document.interactions[0]!.position.y = 372 + 60 + 96 + 27 - 39;
    expect(checker.checkDocument(document).warnings).toEqual([]);
    expect(serviceReadings(document)).toHaveLength(3);
  });

  it("reads a subsystem stretched down to the platform as its consumer", () => {
    const document = stackedLanes();
    nodeById(document, "team_discovery").size.width = 830;
    nodeById(document, "team_platform").size.width = 830;
    document.nodes.push(
      team("team_fraud", "complicated-subsystem", "Fraud Detection", {
        x: 880,
        y: 300,
        width: 170,
        height: 198,
      }),
    );
    document.interactions.push(
      interaction("int_fraud_discovery", "x-as-a-service", { x: 921, y: 234, ...TRIANGLE }),
      interaction("int_platform_fraud", "x-as-a-service", { x: 921, y: 486, ...TRIANGLE }),
    );
    expect(checker.checkDocument(document).warnings).toEqual([]);
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Fraud Detection" → "Product Discovery"',
      'x-as-a-service  "Cloud Platform" → "Fraud Detection"',
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (stacked above "Order Fulfilment")',
      'x-as-a-service  "Cloud Platform" → "Product Discovery"  (stacked above "Order Fulfilment")',
    ]);
  });

  it("stops at a team between two lanes", () => {
    const document = stackedLanes();
    document.nodes.push(
      team("team_tools", "enabling", "", { x: 460, y: 251, width: 120, height: 20 }),
    );
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (stacked above "Order Fulfilment")',
    ]);
  });

  it("serves both lanes of a row inside the stack", () => {
    const document = stackedLanes();
    Object.assign(nodeById(document, "team_checkout"), { size: { width: 280, height: 96 } });
    document.nodes.push(
      team("team_returns", "stream-aligned", "Returns", { x: 540, y: 276, width: 280, height: 96 }),
    );
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (stacked above "Order Fulfilment")',
      'x-as-a-service  "Cloud Platform" → "Returns"  (stacked above "Order Fulfilment")',
      'x-as-a-service  "Cloud Platform" → "Product Discovery"  (stacked above "Order Fulfilment")',
    ]);
    expect(handOffWarnings(document)).toEqual([
      { path: "team_returns", message: handOffMessage("Checkout & Payments", "Returns") },
    ]);
  });

  it("stops at a lane that is not over the platform", () => {
    const document = stackedLanes();
    nodeById(document, "team_platform").size.width = 300;
    nodeById(document, "team_discovery").position.x = 540;
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"  (stacked above "Order Fulfilment")',
    ]);
  });

  it("gives a complicated-subsystem provider no stack reading", () => {
    const document = stackedLanes();
    const provider = nodeById(document, "team_platform");
    provider.type = "complicated-subsystem";
    provider.label = "Fraud Detection";
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Fraud Detection" → "Order Fulfilment"',
    ]);
  });

  it("does not repeat a pair that has its own triangle", () => {
    const document = stackedLanes();
    nodeById(document, "team_checkout").size.width = 900;
    nodeById(document, "team_platform").size.width = 900;
    document.interactions.push(
      interaction("int_platform_checkout", "x-as-a-service", {
        x: 960,
        y: 360,
        width: 88,
        height: 200,
      }),
    );
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Cloud Platform" → "Checkout & Payments"',
      'x-as-a-service  "Cloud Platform" → "Product Discovery"  (stacked above "Checkout & Payments")',
      'x-as-a-service  "Cloud Platform" → "Order Fulfilment"',
    ]);
  });

  it("does not reach from one stacked group into the group above", () => {
    const document = topology(
      [
        team("team_booking", "stream-aligned", "Booking", { x: 220, y: 150, ...LANE }),
        team("team_payments", "stream-aligned", "Payments", { x: 220, y: 276, ...LANE }),
        team("team_mobility", "platform", "Mobility Platform", {
          x: 220,
          y: 426,
          width: 600,
          height: 110,
        }),
        team("team_restaurants", "stream-aligned", "Restaurants", { x: 220, y: 656, ...LANE }),
        team("team_delivery", "stream-aligned", "Delivery", { x: 220, y: 782, ...LANE }),
        team("team_food", "platform", "Food Platform", { x: 220, y: 932, width: 600, height: 110 }),
      ],
      [
        interaction("int_food_delivery", "x-as-a-service", { x: 476, y: 866, ...TRIANGLE }),
        interaction("int_mobility_payments", "x-as-a-service", { x: 476, y: 360, ...TRIANGLE }),
      ],
    );
    expect(checker.checkDocument(document).warnings).toEqual([]);
    expect(serviceReadings(document)).toEqual([
      'x-as-a-service  "Food Platform" → "Delivery"',
      'x-as-a-service  "Food Platform" → "Restaurants"  (stacked above "Delivery")',
      'x-as-a-service  "Mobility Platform" → "Payments"',
      'x-as-a-service  "Mobility Platform" → "Booking"  (stacked above "Payments")',
    ]);
  });
});

describe("plugin checker: stream-aligned teams side by side", () => {
  const row = (): TestTopology =>
    topology([
      team("team_payments", "stream-aligned", "Payments", {
        x: 220,
        y: 180,
        width: 240,
        height: 96,
      }),
      team("team_booking", "stream-aligned", "Booking", { x: 520, y: 180, width: 240, height: 96 }),
    ]);

  it("warns that a row of two lanes reads as a hand-off, on the right-hand team", () => {
    expect(handOffWarnings(row())).toEqual([
      { path: "team_booking", message: handOffMessage("Payments", "Booking") },
    ]);
  });

  it("warns once per neighbouring pair in a longer row", () => {
    const document = row();
    document.nodes.push(
      team("team_onboarding", "stream-aligned", "Onboarding", {
        x: 820,
        y: 180,
        width: 240,
        height: 96,
      }),
    );
    expect(handOffWarnings(document)).toEqual([
      { path: "team_booking", message: handOffMessage("Payments", "Booking") },
      { path: "team_onboarding", message: handOffMessage("Booking", "Onboarding") },
    ]);
  });

  it("warns for teams stepping down like a staircase", () => {
    const document = topology([
      team("team_search", "stream-aligned", "Search", { x: 220, y: 150, width: 300, height: 96 }),
      team("team_checkout", "stream-aligned", "Checkout", {
        x: 580,
        y: 276,
        width: 300,
        height: 96,
      }),
      team("team_delivery", "stream-aligned", "Delivery", {
        x: 940,
        y: 402,
        width: 300,
        height: 96,
      }),
    ]);
    expect(handOffWarnings(document)).toEqual([
      { path: "team_checkout", message: handOffMessage("Search", "Checkout") },
      { path: "team_delivery", message: handOffMessage("Checkout", "Delivery") },
    ]);
  });

  it("warns for a row offset vertically", () => {
    const document = row();
    nodeById(document, "team_booking").position.y = 180 + 49;
    expect(handOffWarnings(document)).toHaveLength(1);
  });

  it("warns for a lane shifted until it shares less than half its width", () => {
    const document = stackedLanes();
    nodeById(document, "team_checkout").position.x = 220 + 299;
    expect(handOffWarnings(document)).toEqual([]);
    nodeById(document, "team_checkout").position.x = 220 + 301;
    expect(handOffWarnings(document)).toHaveLength(2);
  });

  it("does not warn for stacked lanes", () => {
    expect(handOffWarnings(stackedLanes())).toEqual([]);
  });

  it("does not warn for a lane extended over a complicated subsystem", () => {
    const document = stackedLanes();
    nodeById(document, "team_checkout").size.width = 830;
    expect(handOffWarnings(document)).toEqual([]);
  });

  it("does not warn for stream-aligned teams inside a platform grouping", () => {
    const document = stackedLanes();
    Object.assign(nodeById(document, "team_platform"), {
      id: "grp_platform",
      size: { width: 600, height: 260 },
    });
    document.nodes.push(
      team("team_runtime", "stream-aligned", "Runtime", { x: 260, y: 702, width: 240, height: 90 }),
      team("team_maps", "stream-aligned", "Maps", { x: 540, y: 702, width: 240, height: 90 }),
    );
    expect(checker.checkDocument(document).warnings).toEqual([]);
  });

  it("does not warn for a grouping", () => {
    const document = topology([
      team("grp_shop", "stream-aligned", "Shop", { x: 200, y: 140, width: 700, height: 300 }),
      team("team_checkout", "stream-aligned", "Checkout", {
        x: 420,
        y: 320,
        width: 240,
        height: 96,
      }),
    ]);
    expect(handOffWarnings(document)).toEqual([]);
  });

  it("does not warn for two vertically separated groups", () => {
    const document = topology([
      team("team_booking", "stream-aligned", "Booking", { x: 220, y: 150, ...LANE }),
      team("team_payments", "stream-aligned", "Payments", { x: 220, y: 276, ...LANE }),
      team("team_restaurants", "stream-aligned", "Restaurants", { x: 220, y: 492, ...LANE }),
      team("team_delivery", "stream-aligned", "Delivery", { x: 220, y: 618, ...LANE }),
    ]);
    expect(handOffWarnings(document)).toEqual([]);
  });
});

describe("plugin checker: interaction labels", () => {
  const labelWarnings = (label: string): Finding[] => {
    const document = stackedLanes();
    document.interactions[0]!.label = label;
    return checker
      .checkDocument(document)
      .warnings.filter(({ path }) => path === "int_platform_fulfilment");
  };

  it("accepts one short word in an X-as-a-Service triangle", () => {
    expect(labelWarnings("CI/CD")).toEqual([]);
    expect(labelWarnings("runtime")).toEqual([]);
  });

  it("warns when a label fits the triangle's box but runs over its slanted edges", () => {
    expect(labelWarnings("model API")).toEqual([
      {
        path: "int_platform_fulfilment",
        message:
          'x-as-a-service int_platform_fulfilment: the label "model API" runs over the triangle\'s slanted edges (~7 characters fit on one line); use one short word, enlarge the triangle or explain it in an annotation',
      },
    ]);
  });
});
