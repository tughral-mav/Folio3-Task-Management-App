/**
 * Central env access (NFR9/D5: configuration is env-vars only, no platform
 * APIs). NEXT_PUBLIC_* values are inlined at build time; server values are
 * read lazily so a missing var fails loudly at first use, not at import.
 */

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** SEC-2/§4.2: app-layer mirror of private.app_settings.allowed_domain. */
export function allowedGoogleDomain(): string {
  return process.env.FOLIO3_GOOGLE_DOMAIN ?? "folio3.com";
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}
