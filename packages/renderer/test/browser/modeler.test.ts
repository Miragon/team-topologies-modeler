import { expect, test } from "vitest";
import { Modeler } from "@tt-modeler/renderer";
import { SAMPLE_DOCUMENT } from "@tt-modeler/schema-model";

// Real-browser integration: diagram-js relies on SVGElement.getBBox() / getComputedTextLength(),
// which jsdom cannot provide — so this runs in headless Chromium (npm run test:browser).
test("renders the sample document and exports an SVG snapshot", () => {
  const container = document.createElement("div");
  container.style.width = "900px";
  container.style.height = "640px";
  document.body.appendChild(container);

  const modeler = new Modeler({ container });
  try {
    const { warnings } = modeler.importDocument(SAMPLE_DOCUMENT);
    expect(warnings).toHaveLength(0);

    const exported = modeler.exportDocument();
    expect(exported.nodes).toHaveLength(SAMPLE_DOCUMENT.nodes.length);
    expect(exported.interactions).toHaveLength(SAMPLE_DOCUMENT.interactions.length);

    const { svg } = modeler.saveSVG();
    expect(svg).toContain("<svg");
  } finally {
    modeler.destroy();
    container.remove();
  }
});
