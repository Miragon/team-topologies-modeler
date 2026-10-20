// Bundled with the components, so a host that renders a panel can't end up without its styles.
import "./styles/ui.css";

export { InspectorSlotContent } from "./inspector/Inspector";
export type { InspectorSlot, InspectorSlotContentProps } from "./inspector/Inspector";
export { mountInspector } from "./inspector/mountInspector";
export type { MountedInspector } from "./inspector/mountInspector";
export { legendGroups, renderLegendRows } from "./legend/legendRows";
export type { LegendGroup, LegendRow } from "./legend/legendRows";
export { makeRoomForLegend } from "./legend/makeRoomForLegend";
export { diagramMenu } from "./chrome/menu";
export type { DiagramMenuActions } from "./chrome/menu";
export type { ChromeDialog, DialogChrome } from "./dialog/chromeDialog";
export { createShortcutsDialog } from "./shortcuts/shortcutsDialog";
export type { ShortcutsChrome, ShortcutsDialog } from "./shortcuts/shortcutsDialog";
export { createTitleDialog } from "./title/titleDialog";
export type { DiagramTitle, TitleDialog } from "./title/titleDialog";
export { JSON_EXPORT_LABEL, SHORTCUTS_DIALOG_KEY, keyboardShortcuts } from "./shortcuts/shortcuts";
export type { ShortcutGroup, ShortcutOptions, ShortcutRow } from "./shortcuts/shortcuts";
