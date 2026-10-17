/**
 * Top-left floating menu (Excalidraw style): a menu button that opens a dropdown with every file,
 * history, view and export action. It follows the WAI-ARIA menu-button pattern: opening focuses
 * the first item, arrow keys and Home/End move between items, and Escape, Tab or choosing an item
 * closes it and returns focus to the button. The diagram title and Share live outside the menu.
 */

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleQuestionMark,
  FileBraces,
  FileCodeCorner,
  FileImage,
  FilePlus,
  FolderOpen,
  LayoutTemplate,
  LoaderCircle,
  Menu as MenuGlyph,
  Redo2,
  RotateCcwClock,
  Shapes,
  Undo2,
} from "lucide-react";
import { SAMPLE_DOCUMENT, emptyDocument } from "@miragon/team-topologies-schema-model";
import { Icon, makeRoomForLegend, type IconComponent } from "@miragon/team-topologies-ui";
import { FILE_PICKER_ACCEPT } from "@/io/json";
import { useModeler } from "@/state/modelerContext";
import { exportImageWithFeedback, exportJsonWithFeedback, useExportStore } from "@/state/exports";
import { openDocumentFile, replaceDocument, restorePreviousDiagram } from "@/state/replace";
import { IS_APPLE_PLATFORM } from "./platform";
import { useUiStore } from "./uiStore";

const MENU_ID = "tt-main-menu";
const MENU_ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"]';

const SHORTCUTS = IS_APPLE_PLATFORM
  ? {
      undo: { hint: "⌘Z", aria: "Meta+Z" },
      redo: { hint: "⇧⌘Z", aria: "Shift+Meta+Z" },
      open: { hint: "⌘O", aria: "Meta+O" },
      save: { hint: "⌘S", aria: "Meta+S" },
      help: { hint: "?", aria: "?" },
    }
  : {
      undo: { hint: "Ctrl+Z", aria: "Control+Z" },
      redo: { hint: "Ctrl+Y", aria: "Control+Y" },
      open: { hint: "Ctrl+O", aria: "Control+O" },
      save: { hint: "Ctrl+S", aria: "Control+S" },
      help: { hint: "?", aria: "?" },
    };

interface MenuItemProps {
  icon: IconComponent;
  iconClassName?: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  shortcut?: { hint: string; aria: string };
  checked?: boolean;
}

function MenuItem({
  icon,
  iconClassName,
  label,
  onSelect,
  disabled,
  shortcut,
  checked,
}: MenuItemProps) {
  const isCheckbox = checked !== undefined;
  return (
    <button
      type="button"
      className="tt-menu__item"
      role={isCheckbox ? "menuitemcheckbox" : "menuitem"}
      aria-checked={isCheckbox ? checked : undefined}
      aria-disabled={disabled || undefined}
      aria-keyshortcuts={shortcut?.aria}
      tabIndex={-1}
      onClick={() => {
        if (!disabled) onSelect();
      }}
    >
      <Icon
        icon={icon}
        className={iconClassName ? `tt-menu__icon ${iconClassName}` : "tt-menu__icon"}
      />
      <span className="tt-menu__label">{label}</span>
      {shortcut && (
        <kbd className="tt-menu__kbd" aria-hidden="true">
          {shortcut.hint}
        </kbd>
      )}
      {checked && <Icon icon={Check} className="tt-menu__check" />}
    </button>
  );
}

function MenuSeparator() {
  return <div className="tt-menu__sep" role="separator" />;
}

export function Menu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const initialFocus = useRef<"first" | "last">("first");

  const { modeler, title, canUndo, canRedo } = useModeler();

  const setLegend = useUiStore((s) => s.setLegend);
  const legendOpen = useUiStore((s) => s.legendOpen);
  const toggleHelp = useUiStore((s) => s.toggleHelp);
  const backupAvailable = useUiStore((s) => s.backupAvailable);
  const exportBusy = useExportStore((s) => s.busy);

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? []);

  useEffect(() => {
    if (!open) return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? [],
    );
    (initialFocus.current === "last" ? items[items.length - 1] : items[0])?.focus();

    const onOutsidePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutsidePointer);
    return () => document.removeEventListener("mousedown", onOutsidePointer);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openMenu = (focus: "first" | "last") => {
    initialFocus.current = focus;
    setOpen(true);
  };

  // Focus returns to the trigger before the action runs, so a dialog opened by the action
  // (Help) remembers the trigger as the place to return focus to.
  const select = (action: () => void) => () => {
    closeMenu();
    action();
  };

  const toggleLegend = () => {
    if (!legendOpen) makeRoomForLegend(modeler);
    setLegend(!legendOpen);
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowUp" ? "last" : "first");
    }
  };

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const focusAt = (index: number) => items[(index + items.length) % items.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(current < 0 ? items.length - 1 : current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case "Escape":
      case "Tab":
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        break;
    }
  };

  const newDiagram = () => {
    void replaceDocument(modeler, emptyDocument(), { kind: "new" });
  };

  const showExample = () => {
    void replaceDocument(modeler, SAMPLE_DOCUMENT, { kind: "example" });
  };

  const restorePrevious = () => {
    void restorePreviousDiagram(modeler);
  };

  const openFile = () => fileInput.current?.click();

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void openDocumentFile(modeler, file);
  };

  const exportJsonFile = () => exportJsonWithFeedback(modeler);

  const exportImage = (format: "png" | "svg") => {
    void exportImageWithFeedback(modeler, format, title);
  };

  return (
    <div className="tt-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="tt-iconbtn tt-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? MENU_ID : undefined}
        aria-busy={exportBusy !== null || undefined}
        onClick={() => (open ? setOpen(false) : openMenu("first"))}
        onKeyDown={onTriggerKeyDown}
        title="Menu"
      >
        <Icon icon={MenuGlyph} />
        <span className="tt-iconbtn__label">Menu</span>
      </button>

      {open && (
        <div
          id={MENU_ID}
          ref={menuRef}
          className="tt-menu__dropdown"
          role="menu"
          aria-label="Menu"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          <MenuItem icon={FilePlus} label="New diagram" onSelect={select(newDiagram)} />
          <MenuItem icon={LayoutTemplate} label="Show example" onSelect={select(showExample)} />
          <MenuItem
            icon={FolderOpen}
            label="Open…"
            shortcut={SHORTCUTS.open}
            onSelect={select(openFile)}
          />
          {backupAvailable && (
            <MenuItem
              icon={RotateCcwClock}
              label="Restore previous diagram"
              onSelect={select(restorePrevious)}
            />
          )}

          <MenuSeparator />

          <MenuItem
            icon={Undo2}
            label="Undo"
            disabled={!canUndo}
            shortcut={SHORTCUTS.undo}
            onSelect={select(() => modeler.undo())}
          />
          <MenuItem
            icon={Redo2}
            label="Redo"
            disabled={!canRedo}
            shortcut={SHORTCUTS.redo}
            onSelect={select(() => modeler.redo())}
          />

          <MenuSeparator />

          <MenuItem
            icon={Shapes}
            label="Legend"
            checked={legendOpen}
            onSelect={select(toggleLegend)}
          />

          <MenuSeparator />

          <MenuItem
            icon={FileBraces}
            label="Export as JSON"
            shortcut={SHORTCUTS.save}
            onSelect={select(exportJsonFile)}
          />
          {exportBusy === "png" ? (
            <MenuItem
              icon={LoaderCircle}
              iconClassName="tt-icon--spin"
              label="Exporting PNG…"
              disabled
              onSelect={() => undefined}
            />
          ) : (
            <MenuItem
              icon={FileImage}
              label="Export as PNG"
              onSelect={select(() => exportImage("png"))}
            />
          )}
          <MenuItem
            icon={FileCodeCorner}
            label="Export as SVG"
            onSelect={select(() => exportImage("svg"))}
          />

          <MenuSeparator />

          <MenuItem
            icon={CircleQuestionMark}
            label="Help & shortcuts"
            shortcut={SHORTCUTS.help}
            onSelect={select(toggleHelp)}
          />
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={FILE_PICKER_ACCEPT}
        hidden
        onChange={onFileChosen}
      />
    </div>
  );
}
