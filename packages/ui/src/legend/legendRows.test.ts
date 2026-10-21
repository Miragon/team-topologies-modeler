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
    expect(rows.map((row) => row.querySelector(".tt-legend__label")?.textContent)).toEqual(
      legendGroups().flatMap((group) => group.rows.map((row) => row.label)),
    );
    expect(rows).toHaveLength(9);
    for (const row of rows) {
      const preview = row.querySelector(".cd-shell-legend-preview");
      expect(preview?.getAttribute("aria-hidden")).toBe("true");
      expect(preview?.querySelector("svg")).not.toBeNull();
    }
  });

  it("explains each shape next to its symbol, with solid teams and dashed interactions", () => {
    const body = document.createElement("div");
    renderLegendRows(body);

    expect([...body.querySelectorAll(".tt-legend__heading")].map((h) => h.textContent)).toEqual([
      "Teams: solid, long-lived",
      "Interactions: dashed, short-lived",
      "Other elements",
    ]);
    const rows = [...body.querySelectorAll("li.cd-shell-legend-row")];
    expect(rows.map((row) => row.textContent)).toEqual([
      "Stream-aligned Delivers one stream of work",
      "Enabling Coaches teams in new skills",
      "Complicated Subsystem Owns a specialist subsystem",
      "Platform Self-service for other teams",
      "Collaboration Teams work closely for a time",
      "X-as-a-Service One provides, one consumes",
      "Facilitating One team helps another learn",
      "Flow of change Change flows left to right",
      "Annotation Rationale, questions, plans",
    ]);
  });
});
