import { describe, expect, it } from "vitest";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  serializeDocument,
} from "@miragon/team-topologies-schema-model";
import { isAcceptedFileName, looksLikeTeamTopology, parseDocumentText } from "./json";

describe("json import", () => {
  it("opens a serialized diagram", () => {
    const result = parseDocumentText(serializeDocument(SAMPLE_DOCUMENT, true));
    expect(result.ok).toBe(true);
  });

  it("opens an empty diagram and a header-only document", () => {
    expect(parseDocumentText(serializeDocument(emptyDocument(), true)).ok).toBe(true);
    expect(parseDocumentText(JSON.stringify({ version: 1, title: "Draft" })).ok).toBe(true);
  });

  it("rejects text that is not JSON as unreadable", () => {
    const result = parseDocumentText("not json at all");
    expect(result).toMatchObject({ ok: false, reason: "unreadable" });
  });

  it("rejects JSON that is not a Team Topologies diagram", () => {
    expect(
      parseDocumentText(JSON.stringify({ name: "my-package", version: "1.0.0", dependencies: {} })),
    ).toMatchObject({ ok: false, reason: "not-a-diagram" });
    expect(parseDocumentText("[1, 2]")).toMatchObject({ ok: false, reason: "not-a-diagram" });
    expect(parseDocumentText("null")).toMatchObject({ ok: false, reason: "not-a-diagram" });
    expect(looksLikeTeamTopology("text")).toBe(false);
  });

  it("rejects a diagram that breaks the schema as invalid", () => {
    const result = parseDocumentText(
      JSON.stringify({ version: 1, title: "x", nodes: [{ id: "a", type: "unknown-team" }] }),
    );
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("accepts the .tt, .ttm.json and .json file names", () => {
    expect(isAcceptedFileName("team-topology.tt")).toBe(true);
    expect(isAcceptedFileName("Online Shop.TTM.JSON")).toBe(true);
    expect(isAcceptedFileName("export.json")).toBe(true);
    expect(isAcceptedFileName("diagram.png")).toBe(false);
    expect(isAcceptedFileName("notes.txt")).toBe(false);
  });
});
