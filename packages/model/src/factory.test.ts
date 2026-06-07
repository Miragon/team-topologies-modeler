import { describe, expect, it } from "vitest";
import {
  createFlowShape,
  createInteractionShape,
  createTeamNode,
  emptyDocument,
} from "./factory";
import { INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS } from "./notation";

describe("factory", () => {
  it("creates a team node with notation defaults", () => {
    const node = createTeamNode("enabling", { x: 5, y: 6 });
    expect(node.type).toBe("enabling");
    expect(node.position).toEqual({ x: 5, y: 6 });
    expect(node.size).toEqual(TEAM_TYPE_SPECS.enabling.defaultSize);
    expect(node.label).toBe(TEAM_TYPE_SPECS.enabling.label);
    expect(node.id).toMatch(/^team_/);
  });

  it("creates unique ids", () => {
    const a = createTeamNode("platform", { x: 0, y: 0 });
    const b = createTeamNode("platform", { x: 0, y: 0 });
    expect(a.id).not.toBe(b.id);
  });

  it("creates a placed interaction shape with notation defaults", () => {
    const e = createInteractionShape("x-as-a-service", { x: 5, y: 6 });
    expect(e.mode).toBe("x-as-a-service");
    expect(e.position).toEqual({ x: 5, y: 6 });
    expect(e.size).toEqual(INTERACTION_MODE_SPECS["x-as-a-service"].defaultSize);
    expect(e.id).toMatch(/^int_/);
  });

  it("creates a flow-of-change shape", () => {
    const f = createFlowShape({ x: 0, y: 0 });
    expect(f.label).toBe("Flow of change");
    expect(f.id).toMatch(/^flow_/);
    expect(f.size.width).toBeGreaterThan(0);
  });

  it("creates an empty document", () => {
    const doc = emptyDocument("My map");
    expect(doc).toMatchObject({
      version: 2,
      title: "My map",
      nodes: [],
      interactions: [],
      flows: [],
    });
  });
});
