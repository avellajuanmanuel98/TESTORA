import { type KeyboardEvent, useState } from "react";

interface InlineEditableProps {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  canEdit: boolean;
}

/** Click-to-edit text: a plain label until clicked, then an inline input
 * that commits on blur/Enter and discards on Escape. Used anywhere a
 * title/name should be editable in place instead of behind a form/modal. */
export function InlineEditable({ value, onCommit, className, placeholder, canEdit }: InlineEditableProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!canEdit) {
    return <span className={className}>{value || <span className="text-fg-muted">{placeholder}</span>}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`${className} rounded px-1 -mx-1 text-left hover:bg-surface-sunken`}
      >
        {value || <span className="text-fg-muted">{placeholder}</span>}
      </button>
    );
  }

  function commit() {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`${className} -mx-1 rounded border border-accent bg-surface px-1 outline-none`}
    />
  );
}
