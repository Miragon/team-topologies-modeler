import { fileURLToPath, URL } from "node:url";
import { webHeadMarkup } from "@miragon/modeler-shell/core";
import { defineConfig, type Plugin } from "vite";
import tokens from "../../packages/renderer/src/theme/cd-tokens.generated.json" with { type: "json" };
import { THEMES } from "./src/themes.ts";

const fromHere = (path: string): string => fileURLToPath(new URL(path, import.meta.url));
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

/**
 * The web app's mode before the first paint (guide §13.3): a light-only diagram writes
 * `data-cd-theme="light"` statically in index.html, one theme-color and the contrast line of the
 * guide's script. With the joint dark-mode release THEMES gains "dark" and the same call writes
 * the whole script with both theme-colors (index.html then says `data-cd-theme="system"`).
 */
const modeMarkup = (): Plugin => ({
  name: "miragon-mode",
  transformIndexHtml: (html) =>
    html.replace(
      "<!-- miragon-mode -->",
      webHeadMarkup({
        themes: THEMES,
        themeColors: { light: tokens.fest["--cd-blau"], dark: tokens.dunkel["--cd-ui-grund"] },
      }),
    ),
});

export default defineConfig({
  plugins: [modeMarkup(), ...(portlessUrl ? [portlessBanner(portlessUrl)] : [])],
  base: "./",
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
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
      {
        find: "@miragon/team-topologies-ui/ui.css",
        replacement: fromHere("../../packages/ui/src/styles/ui.css"),
      },
      {
        find: "@miragon/team-topologies-ui",
        replacement: fromHere("../../packages/ui/src/index.ts"),
      },
    ],
  },
  // The ui package's inspector is React (its .tsx compiles with the automatic JSX runtime).
  oxc: { jsx: { runtime: "automatic" } },
  server: {
    port: 5181,
    strictPort: true,
    open: portlessUrl ?? false,
    allowedHosts: [".localhost"],
  },
  build: {
    target: "es2022",
    sourcemap: true,
    // The shell inlines Lucide's icon geometry (ISC, partly Feather, MIT) and names both licences
    // in a legal comment; the bundle carries it, as the shell's notices ask.
    rolldownOptions: { output: { comments: { legal: true } } },
  },
});
