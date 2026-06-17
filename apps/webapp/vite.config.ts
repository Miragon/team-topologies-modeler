import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// The demo webapp bundles the @tt-modeler/* packages straight from SOURCE (like the tsconfig paths).
// This keeps the build self-contained: no prior lib build needed (robust for Netlify).
// Ordering matters: the specific CSS subpath BEFORE the package alias.
const fromHere = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: [
      { find: "@", replacement: fromHere("./src") },
      {
        find: "@tt-modeler/renderer/assets/team-topologies.css",
        replacement: fromHere("../../packages/renderer/src/assets/team-topologies.css"),
      },
      {
        find: "@tt-modeler/renderer",
        replacement: fromHere("../../packages/renderer/src/index.ts"),
      },
      {
        find: "@tt-modeler/schema-model",
        replacement: fromHere("../../packages/schema-model/src/index.ts"),
      },
    ],
  },
  server: {
    port: 5181,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
