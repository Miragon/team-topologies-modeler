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
