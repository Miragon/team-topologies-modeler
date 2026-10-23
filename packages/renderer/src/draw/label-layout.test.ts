import { describe, expect, it } from "vitest";
import type { TtElement } from "../model/di-types.js";
import { labelLayout, labelTextBox } from "./label-layout.js";

function team(label: string, width = 240, height = 96): TtElement {
  return {
    id: "team",
    ttKind: "team",
    teamType: "stream-aligned",
    ttLabel: label,
    x: 0,
    y: 0,
    width,
    height,
  } as unknown as TtElement;
}

function annotation(text: string, width = 120, height = 40): TtElement {
  return {
    id: "note",
    ttKind: "annotation",
    ttLabel: text,
    x: 0,
    y: 0,
    width,
    height,
  } as unknown as TtElement;
}

describe("labelTextBox", () => {
  it("is undefined without text", () => {
    expect(labelTextBox(team(""))).toBeUndefined();
    expect(labelTextBox(team("  \n "))).toBeUndefined();
  });

  it("stays inside a shape whose label fits", () => {
    const box = labelTextBox(team("Checkout & Payments"));
    expect(box).toBeDefined();
    if (!box) return;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(240);
    expect(box.y + box.height).toBeLessThanOrEqual(96);
  });

  it("reaches past both sides of the shape, centred, for a word longer than a line", () => {
    const box = labelTextBox(team("reconciliationservicesforallregionalmarketplaces", 160, 64));
    expect(box).toBeDefined();
    if (!box) return;
    expect(box.x).toBeLessThan(0);
    expect(box.x + box.width / 2).toBeCloseTo(80);
  });

  it("flows down from the top-left of an annotation past its bottom", () => {
    const note = annotation(Array.from({ length: 12 }, (_, index) => `Line ${index}`).join("\n"));
    const box = labelTextBox(note);
    const layout = labelLayout(note);
    expect(box).toBeDefined();
    if (!box) return;
    expect(box.x).toBe(layout.box.x);
    expect(box.y).toBe(layout.box.y);
    expect(box.y + box.height).toBeGreaterThan(40);
  });
});
