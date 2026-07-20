import { expect, type Page } from "@playwright/test";

/**
 * Shared gesture + assertion helpers for the webapp e2e specs. Kept deliberately
 * free of any `@miragon/team-topologies-*` import: the modeler's debug surface
 * (exposed on `window.__ttModeler` in apps/webapp/src/ui/DiagramCanvas.tsx) is
 * described here only by the structural shape the specs call into, and read via a
 * local cast — never a global `Window` augmentation, so each spec stays
 * independent (mirrors the copy-paste spec's pattern).
 */

/** The subset of the exported document the specs assert against. */
export interface TtDoc {
  title: string;
  nodes: ReadonlyArray<{ id: string; label: string; type: string }>;
  interactions: ReadonlyArray<{ id: string; mode: string }>;
  flows: ReadonlyArray<{ id: string; label?: string }>;
}

/** Palette entry ids (`data-action`) as registered by TtPaletteProvider. */
export type PaletteAction =
  | "team.stream-aligned"
  | "team.enabling"
  | "team.complicated-subsystem"
  | "team.platform"
  | "mode.collaboration"
  | "mode.x-as-a-service"
  | "mode.facilitating"
  | "flow";

/** A point on the canvas, expressed as a fraction (0..1) of its bounding box. */
export interface CanvasFraction {
  x: number;
  y: number;
}

/** Navigate to the app and wait until the modeler debug surface is attached. */
export async function gotoApp(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(
    () => typeof (window as { __ttModeler?: unknown }).__ttModeler !== "undefined",
  );
}

/** Dismiss the welcome card onto a blank canvas so modelling can begin. */
export async function startBlankCanvas(page: Page): Promise<void> {
  await page.locator(".tt-empty__new").click();
  await expect(page.locator(".tt-empty")).toHaveCount(0);
}

/** Load the bundled example topology (stable ids) via the welcome card. */
export async function loadExample(page: Page): Promise<void> {
  await page.locator(".tt-empty__example").click();
  await expect(page.locator(".tt-canvas .djs-element").first()).toBeVisible();
}

/** Read the current document from the modeler debug surface. */
export function exportDocument(page: Page): Promise<TtDoc> {
  return page.evaluate(() =>
    (
      window as unknown as { __ttModeler: { exportDocument(): TtDoc } }
    ).__ttModeler.exportDocument(),
  );
}

/** Total number of modelled elements (teams + interactions + flows). */
export async function elementCount(page: Page): Promise<number> {
  const doc = await exportDocument(page);
  return doc.nodes.length + doc.interactions.length + doc.flows.length;
}

/** Export the current document, feed it back through import, and re-export. */
export function roundTripDocument(page: Page): Promise<TtDoc> {
  return page.evaluate(() => {
    const modeler = (
      window as unknown as {
        __ttModeler: { exportDocument(): TtDoc; importDocument(doc: unknown): unknown };
      }
    ).__ttModeler;
    const exported = modeler.exportDocument();
    modeler.importDocument(exported);
    return modeler.exportDocument();
  });
}

/**
 * Create an element from the floating palette. diagram-js `Create` is a
 * cursor-follow gesture, not a single click: selecting the palette entry attaches
 * the new shape to the cursor, a `mousemove` positions it, and a click drops it.
 * The `steps` on the move emit the intermediate `mousemove` the tracker needs to
 * register a position before the drop.
 */
export async function createFromPalette(
  page: Page,
  action: PaletteAction,
  at: CanvasFraction,
): Promise<void> {
  const before = await elementCount(page);

  await page.locator(`.djs-palette [data-action="${action}"]`).click();

  const box = (await page.locator(".tt-canvas").boundingBox())!;
  const x = box.x + box.width * at.x;
  const y = box.y + box.height * at.y;
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.click(x, y);

  await expect.poll(() => elementCount(page)).toBe(before + 1);
}

/** Double-click an element and commit a new inline label via the overlay input. */
export async function renameElement(page: Page, elementId: string, label: string): Promise<void> {
  await page.locator(`[data-element-id="${elementId}"]`).dblclick();
  const input = page.locator("input.tt-label-input");
  await expect(input).toBeVisible();
  await input.fill(label);
  await page.keyboard.press("Enter");
  await expect(input).toHaveCount(0);
}

/**
 * Select an element (if not already selected) and delete it via the keyboard
 * shortcut. Re-clicking an already-selected element toggles the selection *off*
 * in diagram-js — and a freshly created shape is selected — so we click to select
 * only when needed, then confirm the selection before pressing Delete.
 */
export async function deleteElement(page: Page, elementId: string): Promise<void> {
  const target = page.locator(`[data-element-id="${elementId}"]`);
  const alreadySelected = await target.evaluate((el) => el.classList.contains("selected"));
  if (!alreadySelected) await target.click();
  await expect(target).toHaveClass(/selected/);
  await page.keyboard.press("Delete");
}

/**
 * The exported SVG with transient interaction state removed: `hover`/`selected`
 * class tokens depend on where the pointer happens to rest, so stripping them
 * keeps the snapshot stable across runs and platforms while leaving every
 * geometry- and content-bearing attribute untouched.
 */
export async function exportStableSvg(page: Page): Promise<string> {
  const { svg } = await page.evaluate(() =>
    (window as unknown as { __ttModeler: { saveSVG(): { svg: string } } }).__ttModeler.saveSVG(),
  );
  return svg.replace(
    /class="([^"]*)"/g,
    (_match, tokens: string) =>
      `class="${tokens
        .split(/\s+/)
        .filter((token) => token && token !== "hover" && token !== "selected")
        .join(" ")}"`,
  );
}
