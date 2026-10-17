import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * A colour input that commits once when the picker closes (the native `change` event), so one pick
 * is one undo step and one autosave.
 */
export function ColorField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (color: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const onCommitRef = useRef(onCommit);
  const valueRef = useRef(value);
  const lastCommitted = useRef<string | null>(null);

  useLayoutEffect(() => {
    onCommitRef.current = onCommit;
    valueRef.current = value;
  });

  useEffect(() => {
    setDraft(value);
    lastCommitted.current = null;
  }, [value]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const commit = () => {
      const next = input.value.toLowerCase();
      if (next === valueRef.current.toLowerCase() || next === lastCommitted.current) return;
      lastCommitted.current = next;
      onCommitRef.current(next);
    };
    input.addEventListener("change", commit);
    input.addEventListener("blur", commit);
    return () => {
      input.removeEventListener("change", commit);
      input.removeEventListener("blur", commit);
    };
  }, []);

  return (
    <label className="tt-field__color">
      <span className="tt-field__label">{label}</span>
      <input
        ref={inputRef}
        type="color"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </label>
  );
}
