import { test, expect } from "@playwright/test";
import { exportStableSvg, gotoApp, loadExample } from "./support/modeler";

/**
 * Golden-file check on the SVG export: the bundled example (fixed ids, fixed
 * geometry, character-count word-wrap) serialises deterministically, so its SVG
 * is a stable baseline. The snapshot path is platform-neutral (see
 * playwright.config.ts) so a single committed baseline is valid on macOS and
 * Linux CI. Regenerate with `npm run test:e2e -- --update-snapshots`.
 */
test.describe("example export snapshot", () => {
  test("the bundled example renders to a stable SVG", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page);
    await loadExample(page);

    // Park the pointer off-canvas so no element carries transient hover state
    // (exportStableSvg also strips hover/selected defensively).
    await page.mouse.move(0, 0);

    const svg = await exportStableSvg(page);
    expect(svg).toMatchSnapshot("example-topology.svg");
  });
});
