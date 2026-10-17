import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted Miragon typeface (Geist) — no CDN, works offline & GDPR-compliant.
// Registers the family 'Geist Variable' used by app.css and the canvas.
import "@fontsource-variable/geist";
// Renderer chrome CSS — brings diagram-js's stylesheet, the canvas chrome, and the vendored Miragon
// `--cd-*` brand tokens that the semantic aliases build on. Imported explicitly (the documented
// consumer contract) so the tokens ship in the app build regardless of side-effect tree-shaking.
import "@miragon/team-topologies-renderer/assets/team-topologies.css";
// Shared chrome CSS (aliases, buttons, fields, inspector, legend), before the app's own layer.
import "@miragon/team-topologies-ui/ui.css";
import "./styles/app.css";
import App from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
