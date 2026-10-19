import { describe, expect, it } from "vitest";
import { legendGroups, renderLegendRows } from "./legendRows";

describe("renderLegendRows", () => {
  it("renders every shape of the notation in three named groups", () => {
    const body = document.createElement("div");
    renderLegendRows(body);

    const groups = [...body.querySelectorAll("ul.tt-legend__group")];
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
      "Team types",
      "Interaction modes",
      "Other elements",
    ]);
    expect(body.querySelectorAll("hr.cd-shell-legend-separator")).toHaveLength(2);
    const rows = [...body.querySelectorAll("li.cd-shell-legend-row")];
    expect(rows.map((row) => row.textContent)).toEqual(
      legendGroups().flatMap((group) => group.rows.map((row) => row.label)),
    );
    expect(rows).toHaveLength(9);
    for (const row of rows) {
      const preview = row.querySelector(".cd-shell-legend-preview");
      expect(preview?.getAttribute("aria-hidden")).toBe("true");
      expect(preview?.querySelector("svg")).not.toBeNull();
    }
  });
});
