import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Consume the workspace packages straight from their TS source.
      "@tt-modeler/model": fileURLToPath(
        new URL("../../packages/model/src/index.ts", import.meta.url),
      ),
      "@tt-modeler/renderer": fileURLToPath(
        new URL("../../packages/renderer/src/index.ts", import.meta.url),
      ),
    },
  },
});
