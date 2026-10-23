import { expect, test, type Page } from "@playwright/test";
import {
  SAMPLE_TEXT,
  diagramLink,
  documentWithWarnings,
  sampleDocument,
  type TtDocumentJson,
} from "./support/app.js";
import {
  CANVAS,
  deleteElement,
  exportDocument,
  gotoApp,
  loadExample,
  openMenu,
  selectedIds,
  startBlankCanvas,
  startScreen,
  toast,
  type TtDoc,
} from "./support/modeler.js";

/**
 * The web app's side of the shell's web chrome: what it hands the shell (menu groups, primary
 * action, legal links, start screen, drop zone, legend, inspector) and its own handlers behind
 * them (share link, replace with undo, open and drop, exports, the title dialog, app keys,
 * problems, the browser's copy of the diagram). What the shell guarantees itself runs in
 * webapp-shell-conformance.spec.ts.
 */

const APP_NAME = "Miragon Modeler for Team Topologies";
const START_TITLE = "Team Topologies Modeler";
const SAMPLE_TITLE = sampleDocument().title;
const AUTOSAVE_KEY = "tt-modeler:document:v1";
const PREVIOUS_KEY = `${AUTOSAVE_KEY}:previous`;

function fileInput(page: Page) {
  return page.locator('body > input[type="file"]');
}

function canvasSvg(page: Page) {
  return page.locator(`${CANVAS} svg[role="application"]`);
}

async function menuLayout(page: Page): Promise<Array<string | null>> {
  const dropdown = await openMenu(page);
  return dropdown.evaluate((menu) =>
    [...menu.querySelectorAll("[data-menu-id], [role='separator']")].map((entry) =>
      entry.getAttribute("role") === "separator" ? "|" : entry.getAttribute("data-menu-id"),
    ),
  );
}

async function chooseMenuEntry(page: Page, menuId: string): Promise<void> {
  await (await openMenu(page)).locator(`[data-menu-id="${menuId}"]`).click();
}

/** A file drop on the page, as the browser delivers one (the drop zone listens on window). */
async function dropFile(page: Page, name: string, text: string): Promise<void> {
  await page.evaluate(
    ({ name, text }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([text], name));
      for (const event of ["dragenter", "dragover", "drop"]) {
        document.body.dispatchEvent(
          new DragEvent(event, { dataTransfer: transfer, bubbles: true, cancelable: true }),
        );
      }
    },
    { name, text },
  );
}

async function readDownload(page: Page, trigger: () => Promise<void>) {
  const download = page.waitForEvent("download");
  await trigger();
  const file = await download;
  const chunks: Buffer[] = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk as Buffer);
  return { name: file.suggestedFilename(), text: Buffer.concat(chunks).toString("utf8") };
}

/** Adds a platform team through the palette's keyboard creation (an edit on the canvas). */
async function addTeamByKeyboard(page: Page): Promise<void> {
  await page.locator('.djs-palette [data-action="team.platform"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("textarea.tt-label-editor")).toBeFocused();
  await page.keyboard.press("Escape");
}

async function renameDiagram(page: Page, title: string): Promise<void> {
  await chooseMenuEntry(page, "diagram-title");
  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await exportDocument(page)).title).toBe(title);
}

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

function storedTitle(page: Page, key = AUTOSAVE_KEY): Promise<string | undefined> {
  return page.evaluate((slot) => {
    const raw = localStorage.getItem(slot);
    return raw ? (JSON.parse(raw) as { title: string }).title : undefined;
  }, key);
}

function previousTitle(page: Page): Promise<string | undefined> {
  return storedTitle(page, PREVIOUS_KEY);
}

test.describe("webapp: the shell web chrome and the app behind it", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("the start screen hides the work chrome until a diagram starts", async ({ page }) => {
    await gotoApp(page);

    await expect(startScreen(page)).toBeVisible();
    await expect(startScreen(page).getByRole("heading", { level: 1 })).toHaveText(START_TITLE);
    await expect(startScreen(page)).toContainText("Or drop a .tt, .ttm.json, or .json file here");
    await expect(page).toHaveTitle(APP_NAME);
    for (const island of ["menu", "primary", "palette", "zoom"]) {
      await expect(page.locator(`[data-chrome="${island}"]`)).toBeHidden();
    }
    await expect(page.locator('[data-chrome="legal"]')).toBeVisible();
    await expect(
      page.locator('[data-chrome="legal"]').getByRole("link", { name: "GitHub" }),
    ).toHaveAttribute("href", "https://github.com/Miragon/team-topologies-modeler");

    await startBlankCanvas(page);
    for (const island of ["menu", "primary", "palette", "zoom"]) {
      await expect(page.locator(`[data-chrome="${island}"]`)).toBeVisible();
    }
    await expect(page.locator('[data-chrome="zoom"] [data-zoom="actual"]')).toHaveText("100%");
    expect(new URL(page.url()).hash).toBe("");
  });

  test("a shared link opens its diagram at once, without the start screen", async ({ page }) => {
    await gotoApp(page, diagramLink(sampleDocument()));

    await expect(startScreen(page)).toBeHidden();
    expect((await exportDocument(page)).title).toBe(SAMPLE_TITLE);
    await expect(page).toHaveTitle(`${SAMPLE_TITLE} · ${APP_NAME}`);
    await expect(page.locator(".cd-shell-toast")).toHaveCount(0);
  });

  test("a damaged link shows a danger toast and stays in the address bar", async ({ page }) => {
    await gotoApp(page, "/#d=broken");

    await expect(startScreen(page)).toBeVisible();
    await expect(toast(page, "This shared link is incomplete or damaged")).toHaveAttribute(
      "data-status",
      "danger",
    );
    expect(new URL(page.url()).hash).toBe("#d=broken");
  });

  test("the menu holds File, Model, Export and Help; no Appearance, no Undo", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);

    expect(await menuLayout(page)).toEqual([
      "new-diagram",
      "open",
      "show-example",
      "|",
      "diagram-title",
      "legend",
      "|",
      "export-png",
      "export-svg",
      "export-json",
      "|",
      "keyboard-shortcuts",
    ]);
    const dropdown = page.locator(".cd-shell-menu[role='menu']");
    await expect(dropdown.locator('[data-menu-id="open"]')).toHaveText(/Open…\s*(⌘|Ctrl\+)O/);
    await expect(dropdown.locator('[data-menu-id="export-json"]')).toHaveText(
      /Export as JSON\s*(⌘|Ctrl\+)S/,
    );
    const shortcutsEntry = dropdown.locator('[data-menu-id="keyboard-shortcuts"]');
    await expect(shortcutsEntry).toHaveText(/Keyboard shortcuts…\s*\?/);
    await expect(shortcutsEntry).toHaveAttribute("aria-keyshortcuts", "?");
    await expect(
      dropdown.getByRole("menuitem", { name: "Keyboard shortcuts…", exact: true }),
    ).toHaveAttribute("data-menu-id", "keyboard-shortcuts");
    await expect(dropdown.locator('[data-menu-group="appearance"]')).toHaveCount(0);
    await expect(dropdown.getByRole("menuitem", { name: /undo|redo/i })).toHaveCount(0);
  });

  test("Share copies the link, writes it into the address bar and confirms with a toast", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Playwright grants clipboard permissions in Chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoApp(page);
    await loadExample(page);

    await page.locator('[data-chrome="primary"]').click();

    await expect(toast(page, "Link copied")).toHaveAttribute("data-status", "success");
    await expect(page.locator(".cd-shell-live [role='status']")).toHaveText("Link copied");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/\/#d=[\w$+-]+$/);
    expect(copied).toBe(page.url());

    const shared = await context.newPage();
    await gotoApp(shared, copied);
    expect(await canonicalDocument(shared)).toEqual(await canonicalDocument(page));
  });

  test("a refused copy points at the address bar", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);
    await page.evaluate(() => {
      const refuse = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: refuse, write: refuse },
      });
    });

    await page.locator('[data-chrome="primary"]').click();

    await expect(
      toast(page, "Couldn't copy the link. Copy it from the address bar instead."),
    ).toHaveAttribute("data-status", "danger");
    expect(new URL(page.url()).hash).toMatch(/^#d=/);
  });

  test("replacing a diagram offers Undo instead of asking first", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);
    const example = await exportDocument(page);

    await chooseMenuEntry(page, "new-diagram");
    await expect.poll(async () => (await exportDocument(page)).nodes.length).toBe(0);

    const offer = toast(page, "Diagram replaced");
    await expect(offer).toHaveAttribute("data-status", "info");
    await offer.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => exportDocument(page)).toEqual(example);
    await expect(offer).toBeHidden();
  });

  test("an edit after a replacement withdraws the undo offer", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);
    await chooseMenuEntry(page, "new-diagram");
    await expect(toast(page, "Diagram replaced")).toBeVisible();

    await addTeamByKeyboard(page);

    await expect(toast(page, "Diagram replaced")).toBeHidden();
    expect((await exportDocument(page)).nodes).toHaveLength(1);
  });

  test("Cmd/Ctrl+Z takes back a replaced diagram while the canvas has nothing to undo", async ({
    page,
  }) => {
    await gotoApp(page, diagramLink(sampleDocument()));
    await chooseMenuEntry(page, "new-diagram");
    await expect.poll(async () => (await exportDocument(page)).nodes.length).toBe(0);
    await expect(toast(page, "Diagram replaced")).toBeVisible();

    await canvasSvg(page).focus();
    await page.keyboard.press("ControlOrMeta+Z");

    await expect.poll(async () => (await exportDocument(page)).title).toBe(SAMPLE_TITLE);
    expect((await exportDocument(page)).nodes.length).toBeGreaterThan(0);
    await expect(toast(page, "Diagram replaced")).toBeHidden();
  });

  test("Cmd/Ctrl+Z on a chrome control undoes the canvas", async ({ page }) => {
    await gotoApp(page);
    await startBlankCanvas(page);
    await addTeamByKeyboard(page);
    expect((await exportDocument(page)).nodes).toHaveLength(1);

    await page.locator('[data-chrome="zoom"] [data-zoom="in"]').focus();
    await page.keyboard.press("ControlOrMeta+Z");
    await expect.poll(async () => (await exportDocument(page)).nodes.length).toBe(0);

    await page.keyboard.press("ControlOrMeta+Shift+Z");
    await expect.poll(async () => (await exportDocument(page)).nodes.length).toBe(1);
  });

  test("Open… reads a .tt file and replaces the diagram", async ({ page }) => {
    await gotoApp(page, diagramLink(documentWithWarnings()));
    const renamed: TtDocumentJson = { ...sampleDocument(), title: "Other topology" };

    await fileInput(page).setInputFiles({
      name: "other.tt",
      mimeType: "",
      buffer: Buffer.from(JSON.stringify(renamed)),
    });

    await expect.poll(async () => (await exportDocument(page)).title).toBe("Other topology");
    await expect(toast(page, "Diagram replaced")).toBeVisible();
    await expect(page).toHaveTitle(`Other topology · ${APP_NAME}`);
    // The new document's import found nothing, so the previous one's problems are gone.
    await expect(page.locator('[data-chrome="problems"]')).toBeHidden();
  });

  test("a file that is no diagram shows a danger toast and keeps the diagram", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);
    const before = await exportDocument(page);

    await fileInput(page).setInputFiles({
      name: "package.json",
      mimeType: "application/json",
      buffer: Buffer.from('{ "name": "my-package", "version": "1.0.0" }'),
    });

    await expect(
      toast(page, "“package.json” doesn't contain a Team Topologies diagram."),
    ).toHaveAttribute("data-status", "danger");
    expect(await exportDocument(page)).toEqual(before);
  });

  test("a dropped .tt file opens on an empty canvas and says so", async ({ page }) => {
    await gotoApp(page);
    await startBlankCanvas(page);

    await dropFile(page, "online-shop.tt", SAMPLE_TEXT);

    await expect.poll(async () => (await exportDocument(page)).title).toBe(SAMPLE_TITLE);
    await expect(toast(page, "Opened “online-shop.tt”")).toHaveAttribute("data-status", "success");
  });

  test("Diagram title… renames the diagram as one undo step", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);

    await chooseMenuEntry(page, "diagram-title");
    const dialog = page.getByRole("dialog", { name: "Diagram title" });
    const field = dialog.getByRole("textbox", { name: "Title" });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue(SAMPLE_TITLE);

    await field.fill("Payments platform");
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-chrome="menu"]')).toBeFocused();
    await expect.poll(async () => (await exportDocument(page)).title).toBe("Payments platform");
    await expect(page).toHaveTitle(`Payments platform · ${APP_NAME}`);

    await page.keyboard.press("ControlOrMeta+Z");
    await expect.poll(async () => (await exportDocument(page)).title).toBe(SAMPLE_TITLE);

    await chooseMenuEntry(page, "diagram-title");
    await field.fill("Discarded");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect((await exportDocument(page)).title).toBe(SAMPLE_TITLE);
  });

  test('"?" opens the keyboard shortcuts with the web app\'s own keys', async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);
    await canvasSvg(page).focus();

    await page.keyboard.press("?");

    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("table", { name: "File" })).toContainText("Open…");
    await expect(dialog.getByRole("table", { name: "File" })).toContainText("Export as JSON");
    await expect(dialog.getByRole("table", { name: "View" })).toContainText("Keyboard shortcuts");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(canvasSvg(page)).toBeFocused();
  });

  test("Cmd/Ctrl+S exports the diagram as .ttm.json", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);

    const file = await readDownload(page, () => page.keyboard.press("ControlOrMeta+S"));

    expect(file.name).toBe("online-shop-team-topology.ttm.json");
    expect(JSON.parse(file.text)).toMatchObject({ title: SAMPLE_TITLE });
    await expect(toast(page, "JSON exported")).toHaveAttribute("data-status", "success");
  });

  test("the menu exports PNG and SVG named after the title", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);

    const svg = await readDownload(page, () => chooseMenuEntry(page, "export-svg"));
    expect(svg.name).toBe("online-shop-team-topology.svg");
    expect(svg.text).toContain("<svg");
    const png = await readDownload(page, () => chooseMenuEntry(page, "export-png"));
    expect(png.name).toBe("online-shop-team-topology.png");
    await expect(toast(page, "PNG exported")).toBeVisible();
  });

  test("import warnings go to the pill and its list, whose rows select their annotation", async ({
    page,
  }) => {
    await gotoApp(page, diagramLink(documentWithWarnings()));

    await expect(
      toast(page, "Imported with 2 warnings. Details under “2 problems” bottom left."),
    ).toHaveAttribute("data-status", "warning");
    const pill = page.locator('[data-chrome="problems"]');
    await expect(pill).toHaveText("2 problems");

    await pill.click();
    const list = page.locator('[data-chrome="problems-popover"]');
    await expect(list.locator(".cd-shell-problem-location")).toHaveText([
      "“Who owns this?”",
      "“Planned split”",
    ]);
    await list.locator(".cd-shell-problem").last().click();

    await expect(list).toBeHidden();
    expect(await selectedIds(page)).toEqual(["ann_orphan_2"]);
  });

  test("a problem goes with the element it was about", async ({ page }) => {
    await gotoApp(page, diagramLink(documentWithWarnings()));
    const pill = page.locator('[data-chrome="problems"]');
    await expect(pill).toHaveText("2 problems");

    await deleteElement(page, "ann_orphan_1");
    await expect(pill).toHaveText("1 problem");
    await deleteElement(page, "ann_orphan_2");
    await expect(pill).toBeHidden();

    await page.keyboard.press("ControlOrMeta+Z");
    await expect(pill).toHaveText("1 problem");
  });

  test("the inspector edits the selection in the shell's panel", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);

    await page.locator('[data-element-id="team_checkout"]').click();
    const inspector = page.locator('[data-chrome="inspector"]');
    await expect(inspector).toBeVisible();
    await expect(inspector).toHaveAttribute("aria-label", "Properties");
    await expect(inspector.getByRole("heading", { name: "Team" })).toBeVisible();

    await inspector.getByRole("textbox", { name: "Name" }).fill("Payments");
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await exportDocument(page)).nodes.find((n) => n.id === "team_checkout"))
      .toMatchObject({ label: "Payments" });

    await inspector.getByRole("button", { name: "Close" }).click();
    await expect(inspector).toBeHidden();
  });

  test("the legend keeps the visitor's choice across visits", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoApp(page);
    await loadExample(page);
    const legend = page.locator('[data-chrome="legend"]');
    await expect(legend).toBeVisible();
    await expect(legend.getByRole("list", { name: "Team types" })).toBeVisible();

    await legend.getByRole("button", { name: "Close legend" }).click();
    await expect(legend).toBeHidden();
    await page.reload();
    await expect(legend).toBeHidden();
  });

  test("on a phone the legend starts closed, and the visitor's choice still wins", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page);
    await loadExample(page);
    const legend = page.locator('[data-chrome="legend"]');
    await expect(legend).toBeHidden();

    await (await openMenu(page)).getByRole("menuitemcheckbox", { name: "Legend" }).click();
    await expect(legend).toBeVisible();
    await page.reload();
    await expect(legend).toBeVisible();
    await expect(legend.getByRole("list", { name: "Team types" })).toBeVisible();
  });

  test("a reload brings the diagram back from the browser's copy", async ({ page }) => {
    await gotoApp(page);
    await startBlankCanvas(page);
    await addTeamByKeyboard(page);
    await expect.poll(() => storedTitle(page)).toBe("Untitled team topology");

    await gotoApp(page, "/");

    await expect(startScreen(page)).toBeHidden();
    expect((await exportDocument(page)).nodes).toHaveLength(1);
  });

  test("a shared link keeps the visitor's own diagram an Undo away and in storage", async ({
    page,
    context,
  }) => {
    await gotoApp(page);
    await loadExample(page);
    await renameDiagram(page, "Own diagram");
    await expect.poll(() => storedTitle(page)).toBe("Own diagram");

    const visit = await context.newPage();
    await gotoApp(visit, diagramLink({ ...sampleDocument(), title: "Shared diagram" }));
    expect((await exportDocument(visit)).title).toBe("Shared diagram");
    await expect(toast(visit, "Diagram replaced")).toBeVisible();
    // Only an edit makes the shared diagram the visitor's own.
    expect(await storedTitle(visit)).toBe("Own diagram");

    await toast(visit, "Diagram replaced").getByRole("button", { name: "Undo" }).click();
    await expect.poll(async () => (await exportDocument(visit)).title).toBe("Own diagram");
  });

  test("the first edit of a shared diagram keeps the own one, which the menu restores", async ({
    page,
    context,
  }) => {
    await gotoApp(page);
    await loadExample(page);
    await renameDiagram(page, "Own diagram");
    await expect.poll(() => storedTitle(page)).toBe("Own diagram");

    const visit = await context.newPage();
    await gotoApp(visit, diagramLink({ ...sampleDocument(), title: "Colleague" }));
    await addTeamByKeyboard(visit);

    await expect(toast(visit, "Diagram replaced")).toBeHidden();
    await expect.poll(() => storedTitle(visit)).toBe("Colleague");
    expect(await previousTitle(visit)).toBe("Own diagram");

    // The copy outlives the tab: a later visit still offers it.
    await visit.close();
    const later = await context.newPage();
    await gotoApp(later, "/");
    expect((await exportDocument(later)).title).toBe("Colleague");
    expect(await menuLayout(later)).toEqual([
      "new-diagram",
      "open",
      "show-example",
      "|",
      "restore-previous",
      "diagram-title",
      "legend",
      "|",
      "export-png",
      "export-svg",
      "export-json",
      "|",
      "keyboard-shortcuts",
    ]);
    await later.keyboard.press("Escape");

    await chooseMenuEntry(later, "restore-previous");
    await expect.poll(async () => (await exportDocument(later)).title).toBe("Own diagram");
    await expect(toast(later, "Diagram replaced")).toBeVisible();
    await expect.poll(() => storedTitle(later)).toBe("Own diagram");
    expect(await previousTitle(later)).toBe("Colleague");
  });

  test("a link pasted into the open tab replaces the diagram the same way", async ({ page }) => {
    await gotoApp(page);
    await loadExample(page);
    await renameDiagram(page, "Own diagram");

    await page.evaluate(
      (hash) => {
        location.hash = hash;
      },
      diagramLink({ ...sampleDocument(), title: "Shared diagram" }).slice(1),
    );

    await expect.poll(async () => (await exportDocument(page)).title).toBe("Shared diagram");
    await expect(toast(page, "Diagram replaced")).toBeVisible();
    expect(await storedTitle(page)).toBe("Own diagram");

    await addTeamByKeyboard(page);
    await expect.poll(() => storedTitle(page)).toBe("Shared diagram");
    expect(await previousTitle(page)).toBe("Own diagram");
  });

  test("a replaced diagram stays restorable after the edit, and restoring swaps the two", async ({
    page,
  }) => {
    await gotoApp(page);
    await loadExample(page);
    expect(await menuLayout(page)).not.toContain("restore-previous");
    await page.keyboard.press("Escape");

    await chooseMenuEntry(page, "new-diagram");
    await addTeamByKeyboard(page);

    await expect.poll(() => previousTitle(page)).toBe(SAMPLE_TITLE);
    await chooseMenuEntry(page, "restore-previous");
    await expect.poll(async () => (await exportDocument(page)).title).toBe(SAMPLE_TITLE);
    await expect.poll(() => previousTitle(page)).toBe("Untitled team topology");
  });
});
