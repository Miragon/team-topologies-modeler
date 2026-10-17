/**
 * DOM-boundary enforcement at the module-graph level. Complements the ESLint rule: forbids the
 * DOM-free package (schema-model) from depending on diagram-js / DOM libraries or on the
 * DOM-dependent @miragon/team-topologies-renderer. Also keeps the layering one-way: the libraries
 * never reach up into the shared React chrome (ui), and ui never into an app.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "dom-free-no-diagram-js",
      comment: "DOM-free packages must not import diagram-js / DOM libraries.",
      severity: "error",
      from: { path: "^packages/(schema-model)/src" },
      to: { path: "node_modules/(diagram-js|tiny-svg|min-dom)" },
    },
    {
      name: "dom-free-no-renderer",
      comment: "DOM-free packages must not depend on the DOM-dependent renderer.",
      severity: "error",
      from: { path: "^packages/(schema-model)/src" },
      to: { path: "^packages/renderer/src" },
    },
    {
      name: "libraries-no-ui",
      comment: "schema-model and renderer stay React-free: they must not depend on the ui package.",
      severity: "error",
      from: { path: "^packages/(schema-model|renderer)/" },
      to: { path: "^packages/ui/" },
    },
    {
      name: "ui-no-apps",
      comment: "The shared ui package is host-agnostic: it must not import from an app.",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: { path: "^apps/" },
    },
    {
      name: "no-circular",
      comment: "No circular dependencies.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
