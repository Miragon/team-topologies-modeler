/**
 * Text input/textarea that holds a local draft and only commits on blur or
 * Enter, so store updates (and undo snapshots) happen once per edit, not per
 * keystroke.
 */

import { useEffect, useState } from "react";

interface CommitInputProps {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  ariaLabel?: string;
}

export function CommitInput({
  value,
  onCommit,
  placeholder,
  multiline,
  ariaLabel,
}: CommitInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  const shared = {
    className: "tt-field__control",
    value: draft,
    placeholder,
    "aria-label": ariaLabel,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
  };

  if (multiline) {
    return <textarea {...shared} rows={3} />;
  }

  return (
    <input
      {...shared}
      type="text"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
