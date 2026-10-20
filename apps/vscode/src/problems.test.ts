import { describe, expect, it } from "vitest";
import { serializeDocument, SAMPLE_DOCUMENT } from "@miragon/team-topologies-schema-model";
import { documentProblems } from "./problems";

const sample = serializeDocument(SAMPLE_DOCUMENT);

function at(text: string, fragment: string): number {
  const offset = text.indexOf(fragment);
  if (offset < 0) throw new Error(`"${fragment}" is not in the text`);
  return offset;
}

describe("documentProblems", () => {
  it("finds nothing in a valid diagram or a blank file", () => {
    expect(documentProblems(sample)).toEqual([]);
    expect(documentProblems("  \n")).toEqual([]);
  });

  it("points at the place where the JSON breaks", () => {
    const broken = sample.replace('"type": "platform",', '"type": "platform"');
    const [problem, ...rest] = documentProblems(broken);
    expect(rest).toEqual([]);
    expect(problem).toMatchObject({
      severity: "error",
      message: "Not valid JSON: expected a comma.",
    });
    expect(problem!.offset).toBeGreaterThan(at(broken, '"type": "platform"'));
  });

  it("points at the value the schema rejects, and at the object that lacks a field", () => {
    const wrongMode = sample.replace('"mode": "collaboration"', '"mode": "handover"');
    const [mode] = documentProblems(wrongMode);
    expect(mode).toMatchObject({ severity: "error", offset: at(wrongMode, '"handover"') });
    expect(mode!.message).toMatch(/^interactions\[\d\]\.mode: /);

    const withoutLabel = sample.replace('"label": "Fraud Detection",\n', "");
    const [label] = documentProblems(withoutLabel);
    expect(label).toMatchObject({ severity: "error", length: 1 });
    expect(withoutLabel[label!.offset]).toBe("{");
  });

  it("calls colliding ids errors", () => {
    const duplicate = sample.replace('"id": "team_fraud"', '"id": "team_checkout"');
    expect(documentProblems(duplicate).map((problem) => problem.severity)).toEqual(["error"]);
  });

  it("warns about a connector the diagram drops, at its attachedTo", () => {
    const dangling = sample.replace(
      '"attachedTo": "int_checkout_fraud"',
      '"attachedTo": "nowhere"',
    );
    expect(documentProblems(dangling)).toEqual([
      {
        severity: "warning",
        message:
          'Annotation "ann_fraud_handover" is attached to "nowhere", which is not in the diagram, so its connector is dropped.',
        offset: at(dangling, '"nowhere"'),
        length: '"nowhere"'.length,
      },
    ]);
  });
});
