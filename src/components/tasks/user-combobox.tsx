"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { UserRef } from "@/server/queries/tasks";

function label(u: UserRef): string {
  return u.full_name || u.email;
}

/**
 * Searchable team-member picker (filter-as-you-type). Replaces the plain
 * <select> for assignee everywhere. Submits the chosen user's id via a hidden
 * input named `name`; the visible input is an ARIA combobox (keyboard: ↑/↓,
 * Enter, Escape). `allowEmpty` enables a clear-to-"anyone" for filters.
 */
export function UserCombobox({
  name,
  users,
  inputId,
  defaultValue = "",
  placeholder,
  allowEmpty = false,
}: {
  name: string;
  users: UserRef[];
  inputId?: string;
  defaultValue?: string;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const listId = useId();
  const initial = users.find((u) => u.id === defaultValue) ?? null;
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [query, setQuery] = useState(initial ? label(initial) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Empty query, or query still equal to the chosen name, shows everyone.
    if (!q || (selectedUser && query === label(selectedUser))) return users;
    return users.filter(
      (u) =>
        label(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [query, users, selectedUser]);

  function choose(u: UserRef) {
    setSelectedId(u.id);
    setQuery(label(u));
    setOpen(false);
  }

  function clear() {
    setSelectedId("");
    setQuery("");
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[active]) {
        e.preventDefault();
        choose(filtered[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} />
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[active] ? `${listId}-opt-${active}` : undefined
        }
        autoComplete="off"
        value={query}
        placeholder={placeholder ?? "Search team members…"}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedId("");
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            // Revert the text to the chosen name (or clear if optional).
            setQuery(selectedUser ? label(selectedUser) : allowEmpty ? "" : query);
          }, 120);
        }}
        onKeyDown={onKeyDown}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
      />
      {allowEmpty && selectedId ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear assignee"
          className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No matches</li>
          ) : (
            filtered.map((u, i) => (
              <li
                key={u.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={u.id === selectedId}
                onMouseEnter={() => setActive(i)}
                // Keep focus (prevent blur) on mousedown; select on click so a
                // pointer selection doesn't race the element detaching.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  choose(u);
                }}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                  i === active ? "bg-indigo-50" : ""
                } ${u.id === selectedId ? "font-medium" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#172b4d] text-[10px] font-semibold text-white"
                >
                  {label(u).charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-zinc-900">{label(u)}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {u.email}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
