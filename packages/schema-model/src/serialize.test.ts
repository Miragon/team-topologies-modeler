import { describe, expect, it } from "vitest";
import { canonicalize, serializeDocument } from "./serialize";
import { SAMPLE_DOCUMENT } from "./sample";
import { parseDocument } from "./schema";
import { DOCUMENT_VERSION } from "./types";
import type { TtDocument } from "./types";

describe("serialize", () => {
  it("rounds coordinates and sizes to 2 decimals", () => {
    const doc: TtDocument = {
      version: DOCUMENT_VERSION,
      title: "t",
      nodes: [
        {
          id: "a",
          type: "stream-aligned",
          label: "A",
          position: { x: 10.123456, y: -3.98765 },
          size: { width: 100.005, height: 50.004 },
        },
      ],
      interactions: [],
      flows: [],
      annotations: [],
    };
    const c = canonicalize(doc);
    expect(c.nodes[0].position).toEqual({ x: 10.12, y: -3.99 });
    expect(c.nodes[0].size).toEqual({ width: 100.01, height: 50 });
  });

  it("sorts nodes by id deterministically", () => {
    const doc: TtDocument = {
      version: DOCUMENT_VERSION,
      title: "t",
      nodes: [
        {
          id: "z",
          type: "platform",
          label: "Z",
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
        },
        {
          id: "a",
          type: "enabling",
          label: "A",
          position: { x: 0, y: 0 },
          size: { width: 1, height: 1 },
        },
      ],
      interactions: [],
      flows: [],
      annotations: [],
    };
    expect(canonicalize(doc).nodes.map((n) => n.id)).toEqual(["a", "z"]);
  });

  it("produces byte-identical output across runs", () => {
    expect(serializeDocument(SAMPLE_DOCUMENT)).toBe(serializeDocument(SAMPLE_DOCUMENT));
  });

  it("omits undefined optional fields", () => {
    const json = serializeDocument(SAMPLE_DOCUMENT);
    const parsed = JSON.parse(json) as TtDocument;
    // sample's platform node has no fill override
    const platform = parsed.nodes.find((n) => n.id === "team_platform");
    expect(platform && "fill" in platform).toBe(false);
  });

  it("normalises annotations: sorted, rounded, attachedTo only when set", () => {
    const doc: TtDocument = {
      version: DOCUMENT_VERSION,
      title: "t",
      nodes: [],
      interactions: [],
      flows: [],
      annotations: [
        {
          id: "b",
          text: "Second",
          position: { x: 1.005, y: 2 },
          size: { width: 100, height: 40 },
          attachedTo: undefined,
        },
        {
          id: "a",
          text: "First",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 40 },
          attachedTo: "team_x",
        },
      ],
    };
    const json = JSON.parse(serializeDocument(doc)) as TtDocument;
    expect(json.annotations.map((a) => a.id)).toEqual(["a", "b"]);
    expect(json.annotations[0].attachedTo).toBe("team_x");
    expect("attachedTo" in json.annotations[1]).toBe(false);
  });

  it("leaves out an empty annotations list", () => {
    const json = serializeDocument({ ...SAMPLE_DOCUMENT, annotations: [] });
    expect(json).not.toContain('"annotations"');
  });

  it("re-saves a v2 document with only its version stamp changed", () => {
    const v2 = JSON.stringify(
      {
        ...canonicalize({ ...SAMPLE_DOCUMENT, annotations: [] }),
        version: 2,
        annotations: undefined,
      },
      null,
      2,
    );
    const parsed = parseDocument(JSON.parse(v2));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const changed = serializeDocument(parsed.document)
      .split("\n")
      .filter((line, idx) => line !== v2.split("\n")[idx]);
    expect(changed).toEqual([`  "version": ${DOCUMENT_VERSION},`]);
  });
});
