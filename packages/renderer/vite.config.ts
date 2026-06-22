import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// diagram-js & its dependency tree are externalized, so they aren't duplicated in the
// consumer bundle (the host app/extension bundles them once from its own node_modules).
const EXTERNAL = [
  "diagram-js",
  /^diagram-js\//,
  "tiny-svg",
  "min-dom",
  "min-dash",
  "didi",
  "object-refs",
  "inherits-browser",
  "path-intersection",
  "@miragon/team-topologies-schema-model",
];

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "team-topologies",
    },
    rollupOptions: {
      external: EXTERNAL,
    },
  },
  plugins: [
    dts({
      entryRoot: "src",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    }),
  ],
});
