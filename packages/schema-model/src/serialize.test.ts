import { describe, expect, it } from "vitest";
import { canonicalize, serializeDocument } from "./serialize";
import { SAMPLE_DOCUMENT } from "./sample";
import type { TtDocument } from "./types";

describe("serialize", () => {
  it("rounds coordinates and sizes to 2 decimals", () => {
    const doc: TtDocument = {
      version: 2,
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
    };
    const c = canonicalize(doc);
    expect(c.nodes[0].position).toEqual({ x: 10.12, y: -3.99 });
    expect(c.nodes[0].size).toEqual({ width: 100.01, height: 50 });
  });

  it("sorts nodes by id deterministically", () => {
    const doc: TtDocument = {
      version: 2,
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
});
