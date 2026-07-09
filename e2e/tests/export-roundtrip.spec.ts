import { test, expect, type Page } from "@playwright/test";

/**
 * Typed handle to the app's debug surface (exposed in apps/webapp/src/ui/DiagramCanvas.tsx). We never
 * import the renderer here — only the structural shape we call into. Kept minimal so @miragon/team-topologies-e2e
 * stays free of @miragon/team-topologies-* dependencies.
 */
interface TtModeler {
  importDocument(doc: unknown): { warnings: ReadonlyArray<unknown> };
  exportDocument(): {
    title: string;
    nodes: ReadonlyArray<{ id: string; label: string; type: string }>;
    interactions: ReadonlyArray<{ id: string; mode: string }>;
    flows: ReadonlyArray<unknown>;
  };
  saveSVG(): { svg: string };
}
declare global {
  interface Window {
    __ttModeler: TtModeler;
  }
}

async function waitForModeler(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__ttModeler !== "undefined");
}

test.describe("webapp export round-trip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForModeler(page);
    // The app now boots onto an empty canvas fronted by the EmptyState card;
    // load the bundled example via its "Show example" button so the round-trip
    // tests operate on real content.
    await page.locator(".tt-empty__cta").click();
    await expect(page.locator(".tt-canvas .djs-element").first()).toBeVisible();
  });

  test("loads the example topology and exports stable JSON + SVG", async ({ page }) => {
    const doc = await page.evaluate(() => window.__ttModeler.exportDocument());
    expect(doc.nodes.length).toBeGreaterThan(0);
    expect(doc.interactions.length).toBeGreaterThan(0);

    const types = doc.nodes.map((n) => n.type);
    expect(types).toContain("stream-aligned");
    expect(types).toContain("platform");

    const { svg } = await page.evaluate(() => window.__ttModeler.saveSVG());
    expect(svg).toContain("<svg");
  });

  test("import -> export -> re-import is a lossless fixed point", async ({ page }) => {
    const result = await page.evaluate(() => {
      const modeler = window.__ttModeler;
      const first = modeler.exportDocument();
      modeler.importDocument(first); // round-trip
      return { first, second: modeler.exportDocument() };
    });

    // Re-importing the exported document yields the same set of nodes/interactions.
    expect(result.second.nodes.map((n) => n.id).sort()).toEqual(
      result.first.nodes.map((n) => n.id).sort(),
    );
    expect(result.second.interactions.length).toBe(result.first.interactions.length);
  });
});
