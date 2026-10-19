import { test, type Page } from "@playwright/test";
import {
  registerShellConformance,
  vsCodeStubSearch,
  type ShellSkip,
} from "@miragon/modeler-shell/testing";
import { WEBVIEW_THEMES } from "../../../apps/vscode/src/themes.js";
import "./support/webview.js";

/**
 * The modeler shell's conformance kit against the real VS Code webview (main.ts inside the VS
 * Code stub): geometry at three sizes, ARIA and keyboard models, chrome keys and select all that
 * never reach VS Code, keyboard creation from the palette, the read-only lock of an invalid file,
 * the appearance VS Code requests (a light-only diagram stays light, high contrast passes) and a
 * clean teardown. Team Topologies has every island of the IDE column (legend and inspector
 * included), so nothing is declared absent and any skip fails the suite.
 */
const describeSkips = (skips: readonly ShellSkip[]): string =>
  skips.map((skip) => `${skip.hook}: ${skip.reason}`).join("; ");

test.describe("VS Code webview: shell conformance", () => {
  test.describe.configure({ timeout: 90_000 });

  registerShellConformance<Page>(
    {
      host: "ide",
      themes: WEBVIEW_THEMES,
      async open(page, { size, requested }) {
        await page.setViewportSize(size);
        await page.goto(`/webview-test.html?${vsCodeStubSearch(requested)}`);
        await page.waitForFunction(() => window.webviewReady === true);
      },
      async destroy(page) {
        await page.evaluate(() => {
          window.connection?.destroy();
          window.modeler?.destroy();
          window.shell?.destroy();
        });
      },
      absent: [],
      show: {
        async legend(page) {
          await page.evaluate(() => window.shell?.legend?.setOpen(true));
        },
        async problems(page) {
          await page.evaluate(() =>
            window.postMessage({ type: "problems", count: 2, errors: 1 }, "*"),
          );
          await page.waitForFunction(
            () => document.querySelector<HTMLElement>('[data-chrome="problems"]')?.hidden === false,
          );
        },
        async status(page) {
          await page.evaluate(() => {
            const shell = window.shell!;
            shell.setStatus({
              severity: "danger",
              text: shell.messages.invalidFile("Team Topologies diagram"),
            });
          });
        },
        // The inspector opens with a selection, the way a click on an element opens it.
        async inspector(page) {
          await page.evaluate(() => {
            const diagram = window.modeler!.diagram;
            const team = diagram
              .get<{ get(id: string): unknown }>("elementRegistry")
              .get("team_checkout");
            diagram.get<{ select(element: unknown): void }>("selection").select(team);
          });
          await page.waitForFunction(
            () =>
              document.querySelector<HTMLElement>('[data-chrome="inspector"]')?.hidden === false,
          );
        },
        // The invalid-file state the way the extension host causes it: an update the document
        // parser rejects (the text editor holds a half-typed value).
        async invalid(page) {
          await page.evaluate(() => {
            const text = window
              .modeler!.exportText()
              .replace('"type": "platform",', '"type": "plat');
            window.postMessage({ type: "update", text }, "*");
          });
        },
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
