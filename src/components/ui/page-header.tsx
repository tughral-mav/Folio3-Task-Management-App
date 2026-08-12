import type { ReactNode } from "react";
import Link from "next/link";

/**
 * FR41: the single page-header template used across every screen — a back
 * link, title, optional subtitle, and an actions slot. Keeps structure and
 * spacing identical app-wide.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  onDark = false,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Light text for placement over the blue Trello board. */
  onDark?: boolean;
}) {
  return (
    <div className="mb-6">
      {back ? (
        <Link
          href={back.href}
          className={
            onDark
              ? "text-sm text-white/80 transition hover:text-white hover:underline"
              : "text-sm text-zinc-500 transition hover:text-zinc-800 hover:underline"
          }
        >
          ← {back.label}
        </Link>
      ) : null}
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className={`text-2xl font-semibold tracking-tight ${
              onDark ? "text-white" : "text-zinc-900"
            }`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={`mt-1 text-sm ${onDark ? "text-white/80" : "text-zinc-600"}`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
