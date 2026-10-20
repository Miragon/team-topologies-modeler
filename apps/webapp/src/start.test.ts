import { describe, expect, it } from "vitest";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";
import { planStart } from "./start";

const OWN_DIAGRAM: TtDocument = { ...SAMPLE_DOCUMENT, title: "Own diagram" };

describe("planStart", () => {
  it("shows the start screen to a first-time visitor", () => {
    const plan = planStart({ status: "absent" }, { status: "absent" });
    expect(plan).toMatchObject({ startScreen: true, announce: false, displaced: null });
    expect(plan.document.nodes).toHaveLength(0);
  });

  it("shows the start screen again when the autosave is empty", () => {
    const saved = emptyDocument("My draft");
    const plan = planStart({ status: "absent" }, { status: "ok", document: saved });
    expect(plan.startScreen).toBe(true);
    expect(plan.document).toBe(saved);
  });

  it("continues a non-empty autosave quietly", () => {
    const plan = planStart({ status: "absent" }, { status: "ok", document: OWN_DIAGRAM });
    expect(plan).toMatchObject({ startScreen: false, announce: false, document: OWN_DIAGRAM });
  });

  it("treats a reload of the own tab as nothing displaced", () => {
    const plan = planStart(
      { status: "ok", document: OWN_DIAGRAM },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan).toMatchObject({ displaced: null, startScreen: false, announce: true });
  });

  it("opens a different shared diagram over the own one, which it displaces", () => {
    const plan = planStart(
      { status: "ok", document: SAMPLE_DOCUMENT },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan).toMatchObject({
      document: SAMPLE_DOCUMENT,
      displaced: OWN_DIAGRAM,
      announce: true,
      startScreen: false,
    });
  });

  it("shows the chrome for a shared empty diagram that displaces the own one", () => {
    const plan = planStart(
      { status: "ok", document: emptyDocument() },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan).toMatchObject({ displaced: OWN_DIAGRAM, startScreen: false });
  });

  it("reports a broken link and falls back to the autosave", () => {
    const plan = planStart(
      { status: "invalid", detail: "truncated" },
      { status: "ok", document: OWN_DIAGRAM },
    );
    expect(plan).toMatchObject({
      sharedLinkProblem: "truncated",
      document: OWN_DIAGRAM,
      announce: false,
    });
  });

  it("reports a damaged autosave and starts fresh", () => {
    const plan = planStart({ status: "absent" }, { status: "corrupt", detail: "bad json" });
    expect(plan).toMatchObject({ autosaveProblem: "bad json", startScreen: true });
  });
});
