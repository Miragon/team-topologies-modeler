// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";

/**
 * Flat Config. The most important project-specific piece is DOM-boundary enforcement:
 * the DOM-free package (schema-model) must not import diagram-js or any DOM library/global, and
 * neither library (schema-model, renderer) imports @miragon/modeler-shell: only the apps and the
 * shared ui mount the chrome. This mirrors the dependency-cruiser check so a violating import fails
 * both `npm run lint` (and so the pre-commit hook) and `npm run depcruise`.
 */

const SHELL_RESTRICTED_IMPORTS = {
  paths: [{ name: "@miragon/modeler-shell", message: "Only the apps and the ui mount the shell." }],
  patterns: [
    { group: ["@miragon/modeler-shell/*"], message: "Only the apps and the ui mount the shell." },
  ],
};

const DOM_RESTRICTED_IMPORTS = {
  paths: [
    { name: "diagram-js", message: "DOM-free packages must not import diagram-js." },
    { name: "tiny-svg", message: "DOM-free packages must not import tiny-svg." },
    { name: "min-dom", message: "DOM-free packages must not import min-dom." },
    ...SHELL_RESTRICTED_IMPORTS.paths,
  ],
  patterns: [
    {
      group: ["diagram-js/*"],
      message: "DOM-free packages must not import diagram-js.",
    },
    ...SHELL_RESTRICTED_IMPORTS.patterns,
  ],
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
      "eslint.config.js",
      "**/*.config.{js,ts,mjs,cjs}",
      ".dependency-cruiser.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // DOM-dependent packages/apps + E2E specs (page.evaluate runs in the browser): browser globals.
  {
    files: [
      "packages/renderer/**/*.ts",
      "packages/ui/**/*.{ts,tsx}",
      "apps/webapp/**/*.ts",
      "e2e/**/*.ts",
    ],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  // The VS Code extension has a Node host AND a browser webview — allow both global sets.
  {
    files: ["apps/vscode/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // Claude Code plugin scripts, the apps' build scripts and the repository's own scripts run as
  // plain Node CLIs.
  {
    files: [
      "plugins/**/*.mjs",
      "apps/vscode/scripts/**/*.mjs",
      "apps/webapp/scripts/**/*.mjs",
      "scripts/**/*.mjs",
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  // React code (the shared chrome package): hooks + fast-refresh hygiene.
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  // The VS Code webview's React panels: an esbuild bundle without hot reload, so hooks only.
  {
    files: ["apps/vscode/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/check-alignment": "error",
      "jsdoc/multiline-blocks": "error",
      "jsdoc/no-multi-asterisks": "error",
    },
  },
  // The renderer: the shell is the apps' chrome, never a library dependency.
  {
    files: ["packages/renderer/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", SHELL_RESTRICTED_IMPORTS],
    },
  },
  // DOM-FREE package: hard boundary.
  {
    files: ["packages/schema-model/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-restricted-imports": ["error", DOM_RESTRICTED_IMPORTS],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "DOM-free package: no window." },
        { name: "document", message: "DOM-free package: no document." },
      ],
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
);
