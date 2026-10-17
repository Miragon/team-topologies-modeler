import { describe, expect, it } from "vitest";
import LZString from "lz-string";
import { buildShareUrl, decodeDocumentFromHash, encodeDocumentToHash } from "./url";
import { serializeDocument } from "@miragon/team-topologies-schema-model";
import { SAMPLE_DOCUMENT } from "@miragon/team-topologies-schema-model";

describe("url sharing", () => {
  it("round-trips a document through the hash payload", () => {
    const encoded = encodeDocumentToHash(SAMPLE_DOCUMENT);
    const decoded = decodeDocumentFromHash(`#d=${encoded}`);
    expect(decoded.status).toBe("ok");
    if (decoded.status !== "ok") return;
    expect(serializeDocument(decoded.document)).toBe(serializeDocument(SAMPLE_DOCUMENT));
  });

  it("builds a share url containing the payload", () => {
    const url = buildShareUrl(SAMPLE_DOCUMENT, "https://example.com/app");
    expect(url.startsWith("https://example.com/app#d=")).toBe(true);
  });

  it("reports a hash without a diagram as absent", () => {
    expect(decodeDocumentFromHash("").status).toBe("absent");
    expect(decodeDocumentFromHash("#").status).toBe("absent");
    expect(decodeDocumentFromHash("#other=1").status).toBe("absent");
  });

  it("reports a damaged diagram payload as invalid, not absent", () => {
    expect(decodeDocumentFromHash("#d=").status).toBe("invalid");
    expect(decodeDocumentFromHash("#d=not-valid-lz").status).toBe("invalid");

    const truncated = encodeDocumentToHash(SAMPLE_DOCUMENT).slice(0, 40);
    expect(decodeDocumentFromHash(`#d=${truncated}`).status).toBe("invalid");

    const schemaViolation = LZString.compressToEncodedURIComponent(
      JSON.stringify({ version: 1, title: "x", nodes: [{ id: 1 }] }),
    );
    const result = decodeDocumentFromHash(`#d=${schemaViolation}`);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.detail).not.toBe("");
  });
});
