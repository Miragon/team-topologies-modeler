import { test, expect, type Page } from "@playwright/test";

/**
 * Counts the elements currently in the modeler via the app's debug surface
 * (apps/webapp/src/ui/DiagramCanvas.tsx). Cast locally rather than augmenting the
 * global Window, so this file stays independent of the other specs' typings.
 */
function elementCount(page: Page) {
  return page.evaluate(() => {
    const modeler = (
      window as unknown as {
        __ttModeler: {
          exportDocument(): {
            nodes: unknown[];
            interactions: unknown[];
            flows: unknown[];
          };
        };
      }
    ).__ttModeler;
    const doc = modeler.exportDocument();
    return doc.nodes.length + doc.interactions.length + doc.flows.length;
  });
}

test.describe("copy & paste", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(
      () => typeof (window as { __ttModeler?: unknown }).__ttModeler !== "undefined",
    );
    await page.locator(".tt-empty__example").click();
    await expect(page.locator(".tt-canvas .djs-element").first()).toBeVisible();
  });

  // End-to-end of the interactive path the unit test can't cover: real keyboard
  // shortcuts (Ctrl+C / Ctrl+V) plus cursor-follow placement via diagram-js Create.
  test("Ctrl+C / Ctrl+V duplicates the selected element at the cursor", async ({ page }) => {
    const before = await elementCount(page);

    const shape = page.locator(".tt-canvas .djs-element.djs-shape").first();
    await shape.click(); // select it

    // Control works on every platform (TtKeyboard checks ctrlKey || metaKey).
    await page.keyboard.press("Control+c");

    // Move over the canvas first so paste has a cursor position, then paste and
    // click to drop the cursor-following copy.
    const canvas = page.locator(".tt-canvas");
    const box = (await canvas.boundingBox())!;
    const dropX = box.x + box.width - 90;
    const dropY = box.y + box.height - 90;
    await page.mouse.move(dropX, dropY);
    await page.keyboard.press("Control+v");
    await page.mouse.move(dropX + 5, dropY + 5);
    await page.mouse.down();
    await page.mouse.up();

    await expect.poll(() => elementCount(page)).toBe(before + 1);
  });
});
