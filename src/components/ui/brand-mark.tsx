/**
 * Shared brand lockup (logo mark + wordmark) for the public auth pages.
 * Presentational only — the mark echoes the app top-bar's kanban glyph as a
 * crisp inline SVG (no external image; CSP/next-image safe).
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-sm"
      >
        {/* Kanban-columns mark — the app's ▦ glyph, drawn. */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <rect x="4" y="4" width="4" height="16" rx="1.5" fill="#ffffff" />
          <rect x="10" y="4" width="4" height="11" rx="1.5" fill="#ffffff" opacity="0.85" />
          <rect x="16" y="4" width="4" height="14" rx="1.5" fill="#ffffff" opacity="0.7" />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight text-zinc-900">
        Folio3 <span className="text-indigo-600">Task Manager</span>
      </span>
    </span>
  );
}
