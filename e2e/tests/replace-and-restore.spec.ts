import { test, expect, type Page } from "@playwright/test";
import {
  deleteElement,
  elementCount,
  exportDocument,
  gotoApp,
  loadExample,
  type TtDoc,
} from "./support/modeler";

/**
 * Replacing a non-empty diagram (Menu › New, Show example, Open, drop) asks first and keeps the
 * replaced diagram in a backup slot, so "Restore previous diagram" can bring it back.
 */

/** The document with every element list in id order; the live canvas order is not stable. */
async function canonicalDocument(page: Page): Promise<TtDoc> {
  const doc = await exportDocument(page);
  const byId = <T extends { id: string }>(items: ReadonlyArray<T>) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id));
  return {
    ...doc,
    nodes: byId(doc.nodes),
    interactions: byId(doc.interactions),
    flows: byId(doc.flows),
    annotations: byId(doc.annotations),
  };
}

async function chooseMenuItem(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

async function dropFile(page: Page, fileName: string, content: string): Promise<void> {
  await page.evaluate(
    ({ fileName, content }) => {
      const canvas = document.querySelector(".tt-canvas")!;
      for (const type of ["dragenter", "dragover", "drop"]) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(new File([content], fileName));
        canvas.dispatchEvent(
          new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }),
        );
      }
    },
    { fileName, content },
  );
}

test.describe("replace and restore", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoApp(page);
    await loadExample(page);
  });

  test("Menu › New asks first, keeps a backup and restores it", async ({ page }) => {
    await deleteElement(page, "team_fraud");
    await expect(page.locator('[data-element-id="team_fraud"]')).toHaveCount(0);
    const edited = await canonicalDocument(page);
    const confirm = page.getByRole("alertdialog", { name: "Replace the current diagram?" });

    await chooseMenuItem(page, "New diagram");
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toHaveCount(0);
    expect(await canonicalDocument(page)).toEqual(edited);

    await chooseMenuItem(page, "New diagram");
    await confirm.getByRole("button", { name: "Replace" }).click();
    await expect.poll(() => elementCount(page)).toBe(0);
    await expect(page.locator(".tt-empty")).toHaveCount(0);

    // The import reset the undo history, so undo cannot bring the deleted team into the new diagram.
    await page.keyboard.press("ControlOrMeta+z");
    expect(await elementCount(page)).toBe(0);

    await chooseMenuItem(page, "Restore previous diagram");
    await expect.poll(() => canonicalDocument(page)).toEqual(edited);
  });

  test("dropping a diagram file asks first and keeps the replaced one", async ({ page }) => {
    const example = await canonicalDocument(page);
    const other = { ...example, title: "Other topology" };

    await dropFile(page, "other.tt", JSON.stringify(other));
    const confirm = page.getByRole("alertdialog", { name: "Replace the current diagram?" });
    await expect(confirm).toContainText("“other.tt” replaces");
    await confirm.getByRole("button", { name: "Replace" }).click();
    await expect.poll(async () => (await exportDocument(page)).title).toBe("Other topology");

    await chooseMenuItem(page, "Restore previous diagram");
    await page
      .getByRole("alertdialog", { name: "Restore the previous diagram?" })
      .getByRole("button", { name: "Restore" })
      .click();
    await expect.poll(() => canonicalDocument(page)).toEqual(example);
  });
});
