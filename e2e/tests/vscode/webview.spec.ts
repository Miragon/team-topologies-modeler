import { expect, test, type Page } from "@playwright/test";
import { EXAMPLE_MAP } from "../../../apps/vscode/src/examples.js";
import {
  exportedDocument,
  openWebview,
  postFromHost,
  postedMessages,
  waitForPosted,
  zoomReadout,
} from "./support/webview.js";

/*
 * The VS Code webview on the modeler shell, driven the way the extension host drives it: document
 * sync and echo, the read-only lock of an invalid file, the empty file, the inspector and legend
 * in the shell's slots, the menu, the Command Palette commands, save and PNG round trips.
 */

const shape = (page: Page, id: string) => page.locator(`[data-element-id="${id}"]`);

async function selectOnCanvas(page: Page, id: string): Promise<void> {
  await shape(page, id).click();
  await expect(shape(page, id)).toHaveClass(/selected/);
}

function renamed(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`"${from}" is not in the document`);
  return text.replace(from, to);
}

test.describe("VS Code webview", () => {
  test("a canvas edit becomes one edit with the canonical document", async ({ page }) => {
    await openWebview(page);
    await selectOnCanvas(page, "team_fraud");
    await page.keyboard.press("Delete");

    const edit = await waitForPosted(page, "edit");
    expect(edit.text).not.toContain("team_fraud");
    expect(String(edit.text).endsWith("}\n")).toBe(true);
    expect((await postedMessages(page)).filter((message) => message.type === "edit")).toHaveLength(
      1,
    );
  });

  test("an outside change keeps the view and the selection", async ({ page }) => {
    await openWebview(page);
    const fitted = await zoomReadout(page);
    await page.locator('[data-zoom="in"]').click();
    // The readout follows on the next animation frame.
    await expect.poll(() => zoomReadout(page)).not.toBe(fitted);
    const zoom = await zoomReadout(page);
    await selectOnCanvas(page, "team_checkout");

    await postFromHost(page, {
      type: "update",
      text: renamed(EXAMPLE_MAP, '"label": "Fraud Detection"', '"label": "Fraud Office"'),
    });

    await expect(shape(page, "team_fraud")).toContainText("Fraud Office");
    expect(await zoomReadout(page)).toBe(zoom);
    await expect(shape(page, "team_checkout")).toHaveClass(/selected/);
    await expect(page.locator('[data-chrome="inspector"]')).toBeVisible();
  });

  test("an invalid text locks canvas and inspector until a valid one arrives", async ({ page }) => {
    await openWebview(page);
    await selectOnCanvas(page, "team_checkout");
    await postFromHost(page, {
      type: "update",
      text: renamed(EXAMPLE_MAP, '"type": "platform",', '"type": "plat'),
    });

    await expect(page.locator(".cd-shell[data-readonly]")).toBeAttached();
    await expect(page.locator('[data-chrome="status"]')).toBeVisible();
    await expect(page.locator('[data-chrome="inspector"]').getByLabel("Name")).toBeDisabled();
    await shape(page, "team_checkout").click();
    await page.keyboard.press("Delete");
    await expect(shape(page, "team_checkout")).toBeAttached();
    expect((await postedMessages(page)).some((message) => message.type === "edit")).toBe(false);

    await postFromHost(page, { type: "update", text: EXAMPLE_MAP });
    await expect(page.locator(".cd-shell[data-readonly]")).not.toBeAttached();
    await expect(page.locator('[data-chrome="status"]')).toBeHidden();
  });

  test("an empty file opens at 100 % with Insert example, which the host writes", async ({
    page,
  }) => {
    await openWebview(page, { doc: "empty" });
    expect(await zoomReadout(page)).toBe("100%");
    const insert = page.getByRole("button", { name: "Insert example" });
    await expect(insert).toBeVisible();

    await insert.click();
    await waitForPosted(page, "insertExample");
    await postFromHost(page, { type: "update", text: EXAMPLE_MAP });

    await expect(insert).toBeHidden();
    await expect(shape(page, "team_checkout")).toBeVisible();
    expect(parseInt((await zoomReadout(page)) ?? "", 10)).toBeLessThanOrEqual(100);
  });

  test("a blank file is a new, empty diagram, not an invalid one", async ({ page }) => {
    await openWebview(page, { doc: "blank" });
    await expect(page.getByRole("button", { name: "Insert example" })).toBeVisible();
    await expect(page.locator(".cd-shell[data-readonly]")).not.toBeAttached();
  });

  test("the inspector in the shell's slot edits the selected team as one edit", async ({
    page,
  }) => {
    await openWebview(page);
    await selectOnCanvas(page, "team_checkout");
    const inspector = page.locator('[data-chrome="inspector"]');
    await expect(inspector).toHaveAttribute("aria-label", "Properties");

    const name = inspector.getByLabel("Name");
    await name.fill("Checkout");
    await name.press("Enter");

    const edit = await waitForPosted(page, "edit");
    expect(edit.text).toContain('"label": "Checkout"');
    await page.keyboard.press("Escape");
    await expect(inspector).toBeHidden();
  });

  test("a save commits the inspector's draft first", async ({ page }) => {
    await openWebview(page);
    await selectOnCanvas(page, "team_checkout");
    await page.locator('[data-chrome="inspector"]').getByLabel("Name").fill("Payments");

    await postFromHost(page, { type: "flush", id: 7 });

    await waitForPosted(page, "flushed");
    const messages = await postedMessages(page);
    const edit = messages.findIndex((message) => message.type === "edit");
    expect(edit).toBeGreaterThanOrEqual(0);
    expect(String(messages[edit]!.text)).toContain('"label": "Payments"');
    expect(edit).toBeLessThan(messages.findIndex((message) => message.type === "flushed"));
  });

  test("the legend keeps its state under the shell's key, carried over once", async ({ page }) => {
    await openWebview(page, { state: { legendOpen: false } });
    await expect(page.locator('[data-chrome="legend"]')).toBeHidden();
    const state = () => page.evaluate(() => window.__modelerShellVsCodeStub!.state());
    expect(await state()).toEqual({ modelerShell: { legendOpen: false } });

    await page.locator('[data-chrome="menu"]').click();
    await page.getByRole("menuitemcheckbox", { name: "Legend" }).click();
    await expect(page.locator('[data-chrome="legend"]')).toBeVisible();
    expect(await state()).toMatchObject({ modelerShell: { legendOpen: true } });
  });

  test("in a phone-wide panel the legend starts closed, and a stored state still wins", async ({
    page,
  }) => {
    const phone = { width: 390, height: 844 };
    const legend = page.locator('[data-chrome="legend"]');
    await openWebview(page, { size: phone });
    await expect(legend).toBeHidden();

    await openWebview(page, { size: phone, state: { modelerShell: { legendOpen: true } } });
    await expect(legend).toBeVisible();
  });

  test("the menu and the Command Palette run the same exports", async ({ page }) => {
    await openWebview(page);
    await page.locator('[data-chrome="menu"]').click();
    await page.getByRole("menuitem", { name: "Export as SVG" }).click();
    const svg = await waitForPosted(page, "export");
    expect(svg).toMatchObject({ format: "svg" });
    expect(String(svg.data)).toContain("data-tt-document=");

    await postFromHost(page, { type: "command", name: "exportPng" });
    await page.waitForFunction(() =>
      window.__modelerShellVsCodeStub!.posted.some(
        (message) => (message as { format?: string }).format === "png",
      ),
    );

    await page.locator('[data-zoom="in"]').click();
    await postFromHost(page, { type: "command", name: "fitView" });
    await expect.poll(async () => parseInt((await zoomReadout(page)) ?? "", 10)).toBeLessThan(100);
  });

  test("a PNG save gets the rendered PNG with the document inside", async ({ page }) => {
    await openWebview(page);
    await postFromHost(page, { type: "requestPng", id: 3, includeDraft: true });
    const response = await waitForPosted(page, "pngResponse");
    expect(response).toMatchObject({ id: 3 });
    expect(String(response.data).startsWith("iVBORw0KGgo")).toBe(true);
  });

  test("Keyboard shortcuts… opens a modal dialog that hands the focus back", async ({ page }) => {
    await openWebview(page);
    const trigger = page.locator('[data-chrome="menu"]');
    await trigger.click();
    await page.getByRole("menuitem", { name: "Keyboard shortcuts…" }).click();

    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("table", { name: "View" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the host's problems show in the pill, which opens the Problems view", async ({ page }) => {
    await openWebview(page);
    await postFromHost(page, { type: "problems", count: 3, errors: 1 });
    const pill = page.locator('[data-chrome="problems"]');
    await expect(pill).toHaveAccessibleName("3 problems, 1 error");
    await pill.click();
    await waitForPosted(page, "showProblems");
  });

  test("a palette entry triggered by the keyboard creates a named team in view", async ({
    page,
  }) => {
    await openWebview(page, { doc: "empty" });
    await page.locator('.djs-palette [data-action="team.platform"]').focus();
    await page.keyboard.press("Enter");

    const editor = page.locator("textarea.tt-label-editor");
    await expect(editor).toBeFocused();
    await editor.fill("Data Platform");
    await editor.press("Enter");
    expect((await exportedDocument(page)).nodes.map((node) => node.label)).toEqual([
      "Data Platform",
    ]);
    await expect
      .poll(async () =>
        String(
          (await postedMessages(page)).filter((message) => message.type === "edit").at(-1)?.text,
        ),
      )
      .toContain('"label": "Data Platform"');
  });
});
