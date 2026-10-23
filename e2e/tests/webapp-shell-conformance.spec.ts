import { test, type Page } from "@playwright/test";
import { registerShellConformance, type ShellSkip } from "@miragon/modeler-shell/testing";
import { THEMES } from "../../apps/webapp/src/themes.js";
import { SAMPLE_TEXT, diagramLink, documentWithWarnings, sampleDocument } from "./support/app.js";
import { typeIntoLabelEditor } from "./support/labelEditor.js";
import { waitForApp } from "./support/modeler.js";

/**
 * The shell's conformance kit against the real web app (the web host of guide §5.2): geometry at
 * three sizes with the primary action, the legal line, the legend, the inspector and the raised
 * zoom row, the legend's start state on a phone, ARIA and keyboard models, the focus after a click
 * on a File action, keyboard creation from the palette, a label editor that the shell's zoom, fit
 * and refit leave open, the light-only mode under any system setting, the start screen, toasts, the
 * problems list with rows that select their annotation, the drop zone and a clean teardown. The
 * web app has no invalid-file state (it edits no text, and a file it cannot read leaves the
 * diagram as it was), so the harness declares only that absent; any skip fails the suite.
 */
const describeSkips = (skips: readonly ShellSkip[]): string =>
  skips.map((skip) => `${skip.hook}: ${skip.reason}`).join("; ");

/** Pages that start every visit without the browser's copy of a diagram or a legend state. */
const freshPages = new WeakSet<Page>();

/** The document as the web app would save it when `labelEditor.open` last resolved. */
const documentAtOpen = new WeakMap<Page, string>();

function currentDocument(page: Page): Promise<string> {
  return page.evaluate(() =>
    JSON.stringify(
      (
        window as unknown as { __ttModeler: { exportDocument(): unknown } }
      ).__ttModeler.exportDocument(),
    ),
  );
}

test.describe("web app: shell conformance", () => {
  test.describe.configure({ timeout: 90_000 });

  registerShellConformance<Page>(
    {
      host: "web",
      themes: THEMES,
      // The kit emulates the system's colour scheme and contrast before every open.
      async open(page, { size }) {
        if (!freshPages.has(page)) {
          freshPages.add(page);
          await page.addInitScript(() => {
            try {
              localStorage.clear();
            } catch {
              // A blocked storage holds no diagram either.
            }
          });
        }
        await page.setViewportSize(size);
        // A new document, as on a first visit: from the app, a link that changes only the fragment
        // keeps the page, and the shell decides the legend's start state once per mount.
        await page.goto("about:blank");
        await page.goto(diagramLink(sampleDocument()));
        await waitForApp(page);
      },
      async destroy(page) {
        await page.evaluate(() => window.__ttApp?.destroy());
      },
      absent: ["invalid"],
      show: {
        async legend(page) {
          await page.evaluate(() => window.__ttApp?.shell.legend?.setOpen(true));
        },
        // A link to a diagram with annotations whose element is gone: the import the visitor
        // started reports them to the pill and its list, each row on its annotation.
        async problems(page) {
          await page.goto(diagramLink(documentWithWarnings()));
          await waitForApp(page);
        },
        async status(page) {
          await page.evaluate(() => {
            const shell = window.__ttApp!.shell;
            shell.setStatus({
              severity: "danger",
              text: shell.messages.invalidFile("Team Topologies diagram"),
            });
          });
        },
        // The inspector opens with a selection, the way a click on an element opens it.
        async inspector(page) {
          await page.evaluate(() => {
            const modeler = (
              window as unknown as {
                __ttModeler: { get<T>(name: string): T };
              }
            ).__ttModeler;
            const team = modeler
              .get<{ get(id: string): unknown }>("elementRegistry")
              .get("team_checkout");
            modeler.get<{ select(element: unknown): void }>("selection").select(team);
          });
          await page.waitForFunction(
            () =>
              document.querySelector<HTMLElement>('[data-chrome="inspector"]')?.hidden === false,
          );
        },
        // A fresh visit: the page without a diagram in its link or in the browser's copy.
        async emptyState(page) {
          await page.goto("/");
          await waitForApp(page);
        },
        async toast(page, { status, text, actionLabel }) {
          await page.evaluate(
            ({ status, text, actionLabel }) => {
              window.__ttApp?.shell.toast({
                status,
                text,
                ...(actionLabel ? { action: { label: actionLabel, onSelect() {} } } : {}),
              });
            },
            { status, text, actionLabel },
          );
        },
      },
      labelEditor: {
        async open(page) {
          const typed = await typeIntoLabelEditor(page);
          documentAtOpen.set(page, await currentDocument(page));
          return typed;
        },
        async documentChanged(page) {
          return (await currentDocument(page)) !== documentAtOpen.get(page);
        },
      },
      drop: {
        // A .tt file has no MIME type the browser knows; a picture is refused already while it is
        // dragged and, dropped all the same, opens nothing.
        accepted: { name: "online-shop.tt", type: "", text: SAMPLE_TEXT },
        rejected: { name: "map.png", type: "image/png", text: "x" },
      },
    },
    test,
    {
      onSkip(caseName, skips) {
        throw new Error(`shell conformance "${caseName}" skipped: ${describeSkips(skips)}`);
      },
    },
  );
});
