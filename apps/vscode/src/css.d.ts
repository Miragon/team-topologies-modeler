// CSS imports are handled by esbuild (bundled into dist/webview.css); typed here as side-effect-only
// modules so the TypeScript compiler accepts `import './style.css'` and the renderer's CSS imports.
declare module "*.css";

// `?dataurl` imports are inlined by the esbuild config as a data: URL string.
declare module "*.woff2?dataurl" {
  const dataUrl: string;
  export default dataUrl;
}
