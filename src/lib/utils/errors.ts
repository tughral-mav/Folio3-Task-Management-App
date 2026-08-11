/**
 * ADR-10: uniform server-action result contract. `message` is always safe to
 * show users (NFR6/SEC-16); technical detail goes to server logs only.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { message: string; fields?: Record<string, string> };
    };

export function failure<T>(
  message: string,
  fields?: Record<string, string>,
): ActionResult<T> {
  return { ok: false, error: { message, fields } };
}

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Log the real error server-side, return a friendly message. */
export function mapDbError<T>(
  context: string,
  error: { code?: string; message?: string } | null,
  friendly: string,
): ActionResult<T> {
  console.error(`[${context}]`, error?.code ?? "", error?.message ?? "");
  return failure(friendly);
}
