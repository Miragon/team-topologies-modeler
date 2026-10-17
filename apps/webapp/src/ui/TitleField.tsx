/**
 * Inline diagram title next to the menu (top-left). It reads as a label and turns into a field on
 * hover and focus; Enter or blur renames the diagram, Escape restores the current name. An empty
 * title is not committed, because exports derive their file names from it.
 */

import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import { Icon } from "@miragon/team-topologies-ui";
import { useModeler } from "@/state/modelerContext";

export function TitleField() {
  const { title, setTitle } = useModeler();
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== title) setTitle(next);
    else setDraft(title);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape" && draft !== title) {
      event.preventDefault();
      setDraft(title);
    }
  };

  return (
    <label className="tt-title" title="Rename diagram">
      <span className="tt-title__sizer" data-value={draft || " "}>
        <input
          className="tt-title__input"
          type="text"
          value={draft}
          size={1}
          spellCheck={false}
          autoComplete="off"
          enterKeyHint="done"
          aria-label="Diagram title"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      </span>
      <Icon icon={PenLine} className="tt-title__icon" />
    </label>
  );
}
