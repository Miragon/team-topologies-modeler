import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// The packages are consumed from SOURCE (mirrors the tsconfig paths / app aliases) so neither
// project needs a prior build. Two projects so the default `npm test` stays fast and DOM-light,
// while the renderer browser-integration layer runs opt-in in real Chromium via `npm run test:browser`
// (jsdom can't provide SVGElement.getBBox() / getComputedTextLength(), which the renderer relies on).
const alias = {
  "@tt-modeler/renderer": fileURLToPath(
    new URL("./packages/renderer/src/index.ts", import.meta.url),
  ),
  "@tt-modeler/schema-model": fileURLToPath(
    new URL("./packages/schema-model/src/index.ts", import.meta.url),
  ),
  "@": fileURLToPath(new URL("./apps/webapp/src", import.meta.url)),
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
            provider: "playwright",
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
