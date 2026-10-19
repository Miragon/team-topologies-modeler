import { describe, expect, it } from "vitest";
import { importWarningsText, problemItems, remainingWarnings } from "./problems";

describe("problemItems", () => {
  it("places a warning on its element and lets the row select it", () => {
    const items = problemItems(
      [{ message: "Its connector was dropped.", elementId: "ann_1" }],
      (id) => (id === "ann_1" ? { label: "  Why platform?  " } : undefined),
    );
    expect(items).toEqual([
      {
        severity: "warning",
        message: "Its connector was dropped.",
        location: "“Why platform?”",
        elementId: "ann_1",
      },
    ]);
  });

  it("keeps a warning whose element is gone, or unlabelled, as text", () => {
    const items = problemItems(
      [
        { message: "Gone.", elementId: "ann_gone" },
        { message: "Unlabelled.", elementId: "ann_blank" },
        { message: "Nowhere." },
      ],
      (id) => (id === "ann_blank" ? { label: " " } : undefined),
    );
    expect(items).toEqual([
      { severity: "warning", message: "Gone." },
      { severity: "warning", message: "Unlabelled.", elementId: "ann_blank" },
      { severity: "warning", message: "Nowhere." },
    ]);
  });
});

describe("remainingWarnings", () => {
  it("drops the warning of an element deleted since the import, and keeps the rest", () => {
    const warnings = [
      { message: "Deleted since.", elementId: "ann_deleted" },
      { message: "Still there.", elementId: "ann_kept" },
      { message: "Never found.", elementId: "ann_unknown" },
      { message: "Nowhere." },
    ];
    const remaining = remainingWarnings(
      warnings,
      new Set(["ann_deleted", "ann_kept"]),
      (id) => id === "ann_kept",
    );
    expect(remaining.map((warning) => warning.message)).toEqual([
      "Still there.",
      "Never found.",
      "Nowhere.",
    ]);
  });
});

describe("importWarningsText", () => {
  it("counts the warnings and names the pill", () => {
    expect(importWarningsText(1, "1 problem")).toBe(
      "Imported with 1 warning. Details under “1 problem” bottom left.",
    );
    expect(importWarningsText(2, "2 problems")).toBe(
      "Imported with 2 warnings. Details under “2 problems” bottom left.",
    );
  });
});
