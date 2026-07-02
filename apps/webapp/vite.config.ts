import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const fromHere = (p: string): string => fileURLToPath(new URL(p, import.meta.url));
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

export default defineConfig({
  plugins: [react(), ...(portlessUrl ? [portlessBanner(portlessUrl)] : [])],
  base: "./",
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@", replacement: fromHere("./src") },
      {
        find: "@miragon/team-topologies-renderer/assets/team-topologies.css",
        replacement: fromHere("../../packages/renderer/src/assets/team-topologies.css"),
      },
      {
        find: "@miragon/team-topologies-renderer",
        replacement: fromHere("../../packages/renderer/src/index.ts"),
      },
      {
        find: "@miragon/team-topologies-schema-model",
        replacement: fromHere("../../packages/schema-model/src/index.ts"),
      },
    ],
  },
  server: {
    port: 5181,
    strictPort: true,
    open: portlessUrl ?? false,
    allowedHosts: [".localhost"],
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
