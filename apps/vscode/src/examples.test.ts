import { describe, expect, it } from "vitest";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  parseDocument,
  serializeDocument,
} from "@miragon/team-topologies-schema-model";
import { EMPTY_MAP, EXAMPLE_MAP, withExampleInserted } from "./examples";

function parsed(text: string) {
  const result = parseDocument(JSON.parse(text));
  if (!result.ok) throw new Error(result.error);
  return result.document;
}

describe("examples", () => {
  it("are canonical files", () => {
    expect(EMPTY_MAP).toBe(serializeDocument(parsed(EMPTY_MAP)));
    expect(EXAMPLE_MAP).toBe(serializeDocument(SAMPLE_DOCUMENT));
  });

  it("insert into an empty diagram as one text, keeping its title and other fields", () => {
    const empty = serializeDocument({
      ...emptyDocument("My platform teams"),
      "x-vendor": "keep-me",
    } as ReturnType<typeof emptyDocument>);
    const inserted = withExampleInserted(empty)!;
    const document = parsed(inserted) as unknown as Record<string, unknown>;
    expect(document.title).toBe("My platform teams");
    expect(document["x-vendor"]).toBe("keep-me");
    expect(parsed(inserted).nodes).toHaveLength(SAMPLE_DOCUMENT.nodes.length);
  });

  it("give a blank file the example's title and keep a CRLF file's line breaks", () => {
    expect(parsed(withExampleInserted("")!).title).toBe(SAMPLE_DOCUMENT.title);
    const crlf = EMPTY_MAP.replace(/\n/g, "\r\n");
    expect(withExampleInserted(crlf)).toMatch(/\r\n/);
    expect(withExampleInserted(crlf)).not.toMatch(/[^\r]\n/);
  });

  it("insert nothing into a broken file or over colliding ids", () => {
    expect(withExampleInserted("{")).toBeUndefined();
    expect(withExampleInserted(EXAMPLE_MAP)).toBeUndefined();
  });
});
