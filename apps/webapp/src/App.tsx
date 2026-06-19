/**
 * Application shell. A full-bleed diagram-js canvas (the framework-agnostic
 * "plain" renderer, with its own top-centre palette) and Excalidraw-style
 * floating chrome layered on top: menu (top-left), Share (top-right), the
 * selection inspector (top-right), the legend (bottom-left) and the legal
 * notice (bottom-right).
 */

import { ModelerProvider } from "@/state/modeler";
import { DiagramCanvas } from "@/ui/DiagramCanvas";
import { Inspector } from "@/ui/Inspector";
import { Menu } from "@/ui/Menu";
import { ShareButton } from "@/ui/ShareButton";
import { Legend } from "@/ui/Legend";
import { LegalNotice } from "@/ui/LegalNotice";
import { HelpDialog } from "@/ui/HelpDialog";
import { Toaster } from "@/ui/Toaster";

export default function App() {
  return (
    <ModelerProvider>
      <div className="tt-app">
        <DiagramCanvas />
        <div className="tt-chrome tt-chrome--left">
          <Menu />
        </div>
        <div className="tt-chrome tt-chrome--right">
          <ShareButton />
        </div>
        <Inspector />
        <Legend />
        <LegalNotice />
        <HelpDialog />
        <Toaster />
      </div>
    </ModelerProvider>
  );
}
