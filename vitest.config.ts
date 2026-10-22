import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath, URL } from "node:url";

// The packages are consumed from SOURCE (mirrors the tsconfig paths / app aliases) so no project
// needs a prior build. Separate projects so the default `npm test` stays fast and DOM-light, while
// the renderer browser-integration layer runs opt-in in real Chromium via `npm run test:browser`
// (jsdom can't provide SVGElement.getBBox() / getComputedTextLength(), which the renderer relies on)
// and the extension's smoke test opt-in in a real VS Code via `npm run test:vscode` (it needs a
// display, packs the VSIX and downloads VS Code once).
const alias = {
  "@miragon/team-topologies-renderer": fileURLToPath(
    new URL("./packages/renderer/src/index.ts", import.meta.url),
  ),
  "@miragon/team-topologies-schema-model": fileURLToPath(
    new URL("./packages/schema-model/src/index.ts", import.meta.url),
  ),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          globals: true,
          environment: "jsdom",
          include: [
            "packages/*/src/**/*.{test,spec}.{ts,tsx}",
            "apps/*/src/**/*.{test,spec}.{ts,tsx}",
            "scripts/**/*.test.ts",
          ],
          exclude: ["packages/renderer/test/browser/**", "**/node_modules/**", "**/dist/**"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "browser",
          include: ["packages/renderer/test/browser/**/*.{test,spec}.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        resolve: { alias },
        test: {
          name: "vscode",
          environment: "node",
          include: ["apps/vscode/test-smoke/**/*.test.ts"],
          // Smoke files run one at a time: two at once would unpack the same VS Code into one folder.
          fileParallelism: false,
        },
      },
    ],
  },
});
