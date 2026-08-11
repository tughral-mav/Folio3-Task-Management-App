/**
 * SEC-2/EC-A3: app-layer mirror of the database domain gate
 * (private.email_domain_allowed). Exact, case-insensitive, full-domain match
 * on the part after the LAST '@' — never endsWith/substring logic.
 *
 * This is defense in depth: the DB trigger is the authoritative gate; this
 * check runs in the auth callback as the server-side backstop.
 */
export function isAllowedEmail(
  email: string | null | undefined,
  allowedDomain: string,
): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return false;
  return email.slice(at + 1).toLowerCase() === allowedDomain.toLowerCase();
}
