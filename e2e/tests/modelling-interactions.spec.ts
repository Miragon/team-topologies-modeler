import { test, expect } from "@playwright/test";
import {
  createFromPalette,
  deleteElement,
  elementCount,
  exportDocument,
  gotoApp,
  renameElement,
  roundTripDocument,
  startBlankCanvas,
  type PaletteAction,
} from "./support/modeler";

/**
 * Drives the core modelling interactions through the real UI (palette create,
 * inline rename, keyboard delete) and asserts the resulting state via the
 * `window.__ttModeler` debug surface. Each test starts from a blank canvas, so
 * they are independent and share no state. The import/export round-trip lives in
 * export-roundtrip.spec.ts; these tests complement it rather than replace it.
 */
test.describe("modelling interactions", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await startBlankCanvas(page);
  });

  const TEAM_CASES: ReadonlyArray<{ action: PaletteAction; type: string }> = [
    { action: "team.stream-aligned", type: "stream-aligned" },
    { action: "team.enabling", type: "enabling" },
    { action: "team.complicated-subsystem", type: "complicated-subsystem" },
    { action: "team.platform", type: "platform" },
  ];

  for (const { action, type } of TEAM_CASES) {
    test(`creates a ${type} team from the palette`, async ({ page }) => {
      await createFromPalette(page, action, { x: 0.45, y: 0.4 });

      const doc = await exportDocument(page);
      expect(doc.nodes).toHaveLength(1);
      expect(doc.nodes[0].type).toBe(type);
      expect(doc.interactions).toHaveLength(0);
      expect(doc.flows).toHaveLength(0);
    });
  }

  const MODE_CASES: ReadonlyArray<{ action: PaletteAction; mode: string }> = [
    { action: "mode.collaboration", mode: "collaboration" },
    { action: "mode.x-as-a-service", mode: "x-as-a-service" },
    { action: "mode.facilitating", mode: "facilitating" },
  ];

  for (const { action, mode } of MODE_CASES) {
    test(`creates a ${mode} interaction from the palette`, async ({ page }) => {
      await createFromPalette(page, action, { x: 0.5, y: 0.45 });

      const doc = await exportDocument(page);
      expect(doc.interactions).toHaveLength(1);
      expect(doc.interactions[0].mode).toBe(mode);
      expect(doc.nodes).toHaveLength(0);
    });
  }

  test("creates a flow-of-change from the palette", async ({ page }) => {
    await createFromPalette(page, "flow", { x: 0.5, y: 0.6 });

    const doc = await exportDocument(page);
    expect(doc.flows).toHaveLength(1);
    expect(doc.nodes).toHaveLength(0);
    expect(doc.interactions).toHaveLength(0);
  });

  test("renames a team inline and the label survives export/re-import", async ({ page }) => {
    await createFromPalette(page, "team.platform", { x: 0.45, y: 0.4 });
    const { nodes } = await exportDocument(page);

    await renameElement(page, nodes[0].id, "Payments Platform");
    expect((await exportDocument(page)).nodes[0].label).toBe("Payments Platform");

    const roundTripped = await roundTripDocument(page);
    expect(roundTripped.nodes[0].label).toBe("Payments Platform");
  });

  test("deletes a team so it leaves the exported model", async ({ page }) => {
    await createFromPalette(page, "team.enabling", { x: 0.4, y: 0.4 });
    const { nodes } = await exportDocument(page);
    expect(await elementCount(page)).toBe(1);

    await deleteElement(page, nodes[0].id);
    await expect.poll(() => elementCount(page)).toBe(0);
  });
});
