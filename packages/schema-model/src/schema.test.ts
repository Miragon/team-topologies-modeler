import { describe, expect, it } from "vitest";
import { parseDocument } from "./schema";
import { SAMPLE_DOCUMENT } from "./sample";

describe("parseDocument", () => {
  it("accepts the sample document", () => {
    const result = parseDocument(SAMPLE_DOCUMENT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.nodes).toHaveLength(5);
      expect(result.document.interactions).toHaveLength(5);
      expect(result.document.flows).toHaveLength(1);
    }
  });

  it("fills in defaults for a sparse object (migration)", () => {
    const result = parseDocument({ nodes: [], interactions: [] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.version).toBe(2);
      expect(typeof result.document.title).toBe("string");
      expect(result.document.flows).toEqual([]);
    }
  });

  it("drops legacy v1 edge interactions and the showFlowOfChange flag", () => {
    const result = parseDocument({
      version: 1,
      title: "x",
      showFlowOfChange: true,
      nodes: [
        {
          id: "a",
          type: "platform",
          label: "A",
          position: { x: 0, y: 0 },
          size: { width: 10, height: 10 },
        },
      ],
      // v1 edge shape: no position/size → not a placeable shape → dropped.
      interactions: [{ id: "e1", mode: "collaboration", source: "a", target: "b" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.version).toBe(2);
      expect(result.document.interactions).toHaveLength(0);
      expect("showFlowOfChange" in result.document).toBe(false);
    }
  });

  it("accepts a placed interaction shape", () => {
    const result = parseDocument({
      version: 2,
      title: "x",
      nodes: [],
      interactions: [
        {
          id: "i1",
          mode: "collaboration",
          position: { x: 1, y: 2 },
          size: { width: 100, height: 60 },
        },
      ],
      flows: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.interactions).toHaveLength(1);
  });

  it("rejects an invalid team type", () => {
    const result = parseDocument({
      version: 2,
      title: "x",
      nodes: [
        {
          id: "a",
          type: "not-a-team",
          label: "A",
          position: { x: 0, y: 0 },
          size: { width: 10, height: 10 },
        },
      ],
      interactions: [],
      flows: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object", () => {
    expect(parseDocument(42).ok).toBe(false);
    expect(parseDocument(null).ok).toBe(false);
  });
});
