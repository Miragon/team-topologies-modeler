import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// The demo webapp bundles the @tt-modeler/* packages straight from SOURCE (like the tsconfig paths).
// This keeps the build self-contained: no prior lib build needed (robust for Netlify).
// Ordering matters: the specific CSS subpath BEFORE the package alias.
const fromHere = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// When started via Portless (`npm run dev:webapp:portless`) the proxy injects PORTLESS_URL — the
// named https://<worktree>.localhost address. We open the browser there (not Vite's 127.0.0.1 port)
// and echo it as an extra line under Vite's URLs so it is obvious in the console. Unset for plain
// `npm run dev:webapp`, which then keeps its current behaviour (Vite on :5181, no auto-open).
const portlessUrl = process.env.PORTLESS_URL || undefined;

const portlessBanner = (url: string): Plugin => ({
  name: "portless-url-banner",
  configureServer(server) {
    const printUrls = server.printUrls.bind(server);
    server.printUrls = () => {
      printUrls();
      server.config.logger.info(
        `  \x1b[32m➜\x1b[0m  \x1b[1mPortless\x1b[0m: \x1b[36m${url}\x1b[0m`,
      );
    };
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ...(portlessUrl ? [portlessBanner(portlessUrl)] : [])],
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
    open: portlessUrl ?? false,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
