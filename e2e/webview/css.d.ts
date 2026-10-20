// What the webview's sources import besides code: stylesheets, and fonts inlined as data: URLs.
declare module "*.css";
declare module "*.woff2?dataurl" {
  const dataUrl: string;
  export default dataUrl;
}
