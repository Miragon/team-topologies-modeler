import { test, expect } from "@playwright/test";
import {
  centreOf,
  drag,
  elementCount,
  exportDocument,
  gotoApp,
  loadExample,
  selectedIds,
} from "./support/modeler";

/**
 * Multi-selection through the real gestures: select all, lasso, Shift+click,
 * then moving and deleting the whole selection at once. Runs on the bundled
 * example (fixed ids).
 */
test.describe("multi-selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page);
    await loadExample(page);
    await page.mouse.move(0, 0);
  });

  test("Ctrl+A selects everything; dragging one element moves all, undone in one step", async ({
    page,
  }) => {
    const before = await exportDocument(page);
    await page.keyboard.press("Control+a");
    const everything = await page.locator(".tt-canvas .djs-element").count();
    await expect.poll(async () => (await selectedIds(page)).length).toBe(everything);

    const from = await centreOf(page, "team_checkout");
    await drag(page, from, { x: from.x + 60, y: from.y + 40 });

    const moved = await exportDocument(page);
    const dx = moved.nodes[0].position.x - before.nodes[0].position.x;
    const dy = moved.nodes[0].position.y - before.nodes[0].position.y;
    expect(dx).not.toBe(0);
    for (const [idx, node] of moved.nodes.entries()) {
      expect(node.position.x - before.nodes[idx].position.x).toBeCloseTo(dx);
      expect(node.position.y - before.nodes[idx].position.y).toBeCloseTo(dy);
    }
    for (const [idx, interaction] of moved.interactions.entries()) {
      expect(interaction.position.x - before.interactions[idx].position.x).toBeCloseTo(dx);
    }

    await page.keyboard.press("Control+z");
    await expect.poll(() => exportDocument(page)).toEqual(before);
  });

  test("Shift+drag on empty canvas lasso-selects the enclosed elements", async ({ page }) => {
    const discovery = (await page.locator('[data-element-id="team_discovery"]').boundingBox())!;
    const checkout = (await page.locator('[data-element-id="team_checkout"]').boundingBox())!;

    await page.keyboard.down("Shift");
    await drag(
      page,
      { x: discovery.x - 8, y: discovery.y - 6 },
      { x: checkout.x + checkout.width + 8, y: checkout.y + checkout.height + 4 },
    );
    await page.keyboard.up("Shift");

    const selected = await selectedIds(page);
    expect(selected).toContain("team_discovery");
    expect(selected).toContain("team_checkout");
    expect(selected).not.toContain("team_platform");
  });

  test("Shift+click adds to and removes from the selection; Delete removes it all", async ({
    page,
  }) => {
    const before = await elementCount(page);

    await page.locator('[data-element-id="team_checkout"]').click();
    await page.locator('[data-element-id="team_platform"]').click({ modifiers: ["Shift"] });
    await page.locator('[data-element-id="team_discovery"]').click({ modifiers: ["Shift"] });
    expect(await selectedIds(page)).toEqual(["team_checkout", "team_discovery", "team_platform"]);

    await page.locator('[data-element-id="team_discovery"]').click({ modifiers: ["Shift"] });
    expect(await selectedIds(page)).toEqual(["team_checkout", "team_platform"]);

    await page.keyboard.press("Delete");
    await expect.poll(() => elementCount(page)).toBe(before - 2);
  });
});
