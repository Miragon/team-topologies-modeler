import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@tt-modeler/model": fileURLToPath(
        new URL("./packages/model/src/index.ts", import.meta.url),
      ),
      "@tt-modeler/renderer": fileURLToPath(
        new URL("./packages/renderer/src/index.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "packages/*/src/**/*.{test,spec}.{ts,tsx}",
      "apps/*/src/**/*.{test,spec}.{ts,tsx}",
    ],
  },
});
