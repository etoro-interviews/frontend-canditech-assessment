"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  className?: string;
  inputClassName?: string;
  as?: "h1" | "h2" | "h3" | "span";
};

/** Click-to-edit title: Enter saves, Esc cancels, blur saves. */
export function InlineTitle({
  value,
  onSave,
  className = "",
  inputClassName = "",
  as: Tag = "span",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    const next = draft.trim();
    if (!next || next === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setPending(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch (err) {
      setDraft(value);
      setEditing(false);
      throw err;
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit().catch(() => undefined);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(value);
      setEditing(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void commit().catch(() => undefined);
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="min-w-0 flex-1">
        <input
          ref={inputRef}
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit().catch(() => undefined)}
          onKeyDown={onKeyDown}
          className={`w-full rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--surface)] px-2 py-1 outline-none ${inputClassName}`}
        />
      </form>
    );
  }

  return (
    <Tag
      role="button"
      tabIndex={0}
      title={value}
      className={`min-w-0 cursor-text truncate rounded-[var(--radius)] px-1 -mx-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${className}`}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      {value}
    </Tag>
  );
}
