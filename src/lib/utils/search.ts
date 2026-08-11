/**
 * SEC-14 / code-review Finding #1: allowlist sanitizer for search text before
 * it is placed in a PostgREST filter DSL. Keeps only characters safe as an
 * ilike literal — strips the filter metacharacters (`,()`), the SQL LIKE
 * wildcards (`%_`), the PostgREST wildcard (`*`), backslash, and quotes. The
 * result can never start a new filter term, reach another column, or act as a
 * wildcard. Kept in its own module (no `server-only`) so it is unit-testable.
 */
export function sanitizeSearch(raw: string): string {
  // Note: `_` is excluded — it is a LIKE single-character wildcard, so it must
  // be treated as a literal separator, not kept.
  return raw.replace(/[^A-Za-z0-9 @.-]/g, " ").replace(/\s+/g, " ").trim();
}
