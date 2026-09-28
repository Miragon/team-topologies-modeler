import { test, expect } from "@playwright/test";
import {
  centreOf,
  createFromPalette,
  drag,
  exportDocument,
  gotoApp,
  loadExample,
  startBlankCanvas,
} from "./support/modeler";

/**
 * Text annotations through the real UI: palette create with multi-line text,
 * the context-pad "Add annotation" action, a connector that follows its team,
 * and survival across a reload (autosave).
 */
test.describe("annotations", () => {
  test("creates an annotation from the palette with multi-line text", async ({ page }) => {
    await gotoApp(page);
    await startBlankCanvas(page);
    await createFromPalette(page, "annotation", { x: 0.45, y: 0.45 });

    const [annotation] = (await exportDocument(page)).annotations;
    await page.locator(`[data-element-id="${annotation.id}"]`).dblclick();
    const editor = page.locator("textarea.tt-label-editor");
    await expect(editor).toBeVisible();
    await page.keyboard.type("Why platform, not enabling?");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("Decided in the Q2 workshop.");
    await page.keyboard.press("Enter");
    await expect(editor).toHaveCount(0);

    const [saved] = (await exportDocument(page)).annotations;
    expect(saved.text).toBe("Why platform, not enabling?\nDecided in the Q2 workshop.");
    expect(saved.attachedTo).toBeUndefined();
  });

  test("'Add annotation' attaches a note that follows its team and survives a reload", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page);
    await loadExample(page);

    const connectors = page.locator(".tt-canvas .djs-connection");
    const connectorsBefore = await connectors.count();
    await page.locator('[data-element-id="team_fraud"]').click();
    await page.locator('.djs-context-pad [data-action="append-annotation"]').click();
    const editor = page.locator("textarea.tt-label-editor");
    await expect(editor).toBeFocused();
    await page.keyboard.type("Splits into two stream-aligned teams in Q3");
    await page.keyboard.press("Enter");

    const created = (await exportDocument(page)).annotations.find(
      (a) => a.attachedTo === "team_fraud",
    );
    expect(created?.text).toBe("Splits into two stream-aligned teams in Q3");
    await expect(connectors).toHaveCount(connectorsBefore + 1);

    await page.mouse.click(5, 400); // deselect
    const from = await centreOf(page, "team_fraud");
    await drag(page, from, { x: from.x - 40, y: from.y + 60 });
    expect((await exportDocument(page)).annotations).toContainEqual(
      expect.objectContaining({ id: created!.id, attachedTo: "team_fraud" }),
    );

    // The autosave is debounced; wait until the address bar carries the change.
    await page.waitForTimeout(900);
    await page.reload();
    await page.waitForFunction(
      () => typeof (window as { __ttModeler?: unknown }).__ttModeler !== "undefined",
    );
    expect((await exportDocument(page)).annotations).toContainEqual(
      expect.objectContaining({ id: created!.id, attachedTo: "team_fraud" }),
    );
    await expect(connectors).toHaveCount(connectorsBefore + 1);
  });

  test("detaching in the inspector and re-attaching via the link action", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page);
    await loadExample(page);

    await page.locator('[data-element-id="ann_fraud_handover"]').click();
    await page.getByRole("button", { name: "Detach" }).click();
    await expect(page.locator(".tt-canvas .djs-connection")).toHaveCount(0);
    expect(
      (await exportDocument(page)).annotations.find((a) => a.id === "ann_fraud_handover"),
    ).not.toHaveProperty("attachedTo");

    // The annotation is still selected, so its context pad is still open.
    await page.locator('.djs-context-pad [data-action="connect"]').click();
    const target = await centreOf(page, "team_platform");
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.click(target.x, target.y);

    await expect(page.locator(".tt-canvas .djs-connection")).toHaveCount(1);
    expect((await exportDocument(page)).annotations).toContainEqual(
      expect.objectContaining({ id: "ann_fraud_handover", attachedTo: "team_platform" }),
    );
  });
});
