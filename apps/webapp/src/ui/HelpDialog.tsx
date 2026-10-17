/**
 * Help & shortcuts: a short notation primer plus every canvas shortcut and gesture, with the key
 * names of the visitor's platform. `?` opens it from anywhere except while typing.
 */

import { Fragment, useEffect } from "react";
import { Modal } from "./Modal";
import { IS_APPLE_PLATFORM } from "./platform";
import { isDialogOpen, useUiStore } from "./uiStore";
const MOD = IS_APPLE_PLATFORM ? "⌘" : "Ctrl";
const SHIFT = IS_APPLE_PLATFORM ? "⇧" : "Shift";

/** One way to trigger an action: a key combination, a pointer gesture, or both ("Shift + click"). */
interface Input {
  keys?: string[];
  gesture?: string;
}

interface Shortcut {
  inputs: Input[];
  /** Shown after the input, e.g. "while editing". */
  context?: string;
  action: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const keys = (...combo: string[]): Input => ({ keys: combo });
const gesture = (text: string, ...combo: string[]): Input => ({ keys: combo, gesture: text });

const REDO_INPUTS = IS_APPLE_PLATFORM
  ? [keys(SHIFT, MOD, "Z"), keys(MOD, "Y")]
  : [keys(MOD, "Y"), keys(MOD, SHIFT, "Z")];

const DELETE_INPUTS = IS_APPLE_PLATFORM ? [keys("Delete")] : [keys("Delete"), keys("Backspace")];

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "File",
    shortcuts: [
      { inputs: [keys(MOD, "S")], action: "Save as JSON" },
      { inputs: [keys(MOD, "O")], action: "Open a file" },
    ],
  },
  {
    title: "Edit",
    shortcuts: [
      {
        inputs: [keys("Enter"), keys("Space")],
        context: "on a palette or context pad button",
        action: "Add the element or run the action",
      },
      { inputs: [gesture("Double-click an element")], action: "Edit its name or text" },
      { inputs: [keys("Enter")], context: "while editing", action: "Save the text" },
      { inputs: [keys(SHIFT, "Enter")], context: "while editing", action: "Start a new line" },
      { inputs: [keys("Esc")], context: "while editing", action: "Discard the change" },
      { inputs: [gesture("Drag a team's corner")], action: "Resize it to show cognitive load" },
      { inputs: [keys(MOD, "C")], action: "Copy the selection" },
      { inputs: [keys(MOD, "V")], action: "Paste" },
      { inputs: DELETE_INPUTS, action: "Delete the selection" },
      { inputs: [keys(MOD, "Z")], action: "Undo" },
      { inputs: REDO_INPUTS, action: "Redo" },
    ],
  },
  {
    title: "Select and move",
    shortcuts: [
      { inputs: [gesture("click", SHIFT)], action: "Add to or remove from the selection" },
      { inputs: [gesture("drag on the canvas", SHIFT)], action: "Select an area" },
      { inputs: [keys(MOD, "A")], action: "Select all" },
      { inputs: [keys("Esc")], action: "Clear the selection" },
      { inputs: [keys("Esc")], context: "in the properties panel", action: "Close the panel" },
      { inputs: [keys("Arrow keys")], action: "Nudge the selection" },
      { inputs: [keys(SHIFT, "Arrow keys")], action: "Nudge in bigger steps" },
    ],
  },
  {
    title: "View",
    shortcuts: [
      {
        inputs: [gesture("Drag an empty spot"), gesture("scroll")],
        action: "Pan the canvas",
      },
      { inputs: [gesture("scroll", MOD), gesture("pinch")], action: "Zoom" },
      { inputs: [keys("+")], action: "Zoom in" },
      { inputs: [keys("-")], action: "Zoom out" },
      { inputs: [keys(SHIFT, "1")], action: "Fit the diagram to the window" },
      { inputs: [keys(SHIFT, "0")], action: "Zoom to 100%" },
    ],
  },
  {
    title: "Help",
    shortcuts: [
      { inputs: [keys("?")], action: "Open this help" },
      { inputs: [keys("Esc")], action: "Close a dialog or menu" },
    ],
  },
];

function InputLabel({ input }: { input: Input }) {
  const combo = input.keys ?? [];
  return (
    <span className="tt-shortcut__input">
      {combo.map((key, index) => (
        <Fragment key={key}>
          {index > 0 && <span className="tt-shortcut__plus">+</span>}
          <kbd>{key}</kbd>
        </Fragment>
      ))}
      {input.gesture && combo.length > 0 && <span className="tt-shortcut__plus">+</span>}
      {input.gesture}
    </span>
  );
}

function ShortcutTable({ group }: { group: ShortcutGroup }) {
  return (
    <table className="tt-shortcuts">
      <caption className="tt-shortcuts__caption">{group.title}</caption>
      <tbody>
        {group.shortcuts.map((shortcut) => (
          <tr key={`${shortcut.action}-${shortcut.context ?? ""}`}>
            <td className="tt-shortcuts__input">
              {shortcut.inputs.map((input, index) => (
                <Fragment key={index}>
                  {index > 0 && <span className="tt-shortcut__or">or</span>}
                  <InputLabel input={input} />
                </Fragment>
              ))}
              {shortcut.context && <span className="tt-shortcut__context">{shortcut.context}</span>}
            </td>
            <td>{shortcut.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function HelpDialog() {
  const open = useUiStore((s) => s.helpOpen);
  const setHelp = useUiStore((s) => s.setHelp);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTypingTarget(event.target) || isDialogOpen()) return;
      if (event.target instanceof Element && event.target.closest('[role="menu"]')) return;
      event.preventDefault();
      setHelp(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setHelp]);

  if (!open) return null;

  const close = () => setHelp(false);

  return (
    <Modal
      title="Help & shortcuts"
      onClose={close}
      footer={
        <button type="button" className="tt-btn tt-btn--primary" onClick={close}>
          Close
        </button>
      }
    >
      <p>
        Model your organisation as <strong>four team types</strong> connected by{" "}
        <strong>three interaction modes</strong>. Team shapes are solid (long-lived); interactions
        are dashed and translucent (short-lived). Place teams left to right along the flow of
        change, and size a team to hint at its cognitive load. Use <strong>annotations</strong> for
        the context around a team: rationale, open questions, planned changes.
      </p>

      {SHORTCUT_GROUPS.map((group) => (
        <ShortcutTable key={group.title} group={group} />
      ))}

      <p className="tt-modal__foot">
        Your work autosaves in this browser. Use <strong>Share</strong> for a self-contained link,
        or <strong>Export as JSON</strong> for a lossless, version-controllable file. If you replace
        a diagram by mistake, <strong>Restore previous diagram</strong> in the menu brings it back.
      </p>
    </Modal>
  );
}
