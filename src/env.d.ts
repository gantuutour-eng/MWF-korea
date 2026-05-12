/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  MEDIA: R2Bucket;
  SESSION_COOKIE_NAME: string;
  /** Google OAuth client id (public). Set via wrangler vars or .dev.vars locally. */
  GOOGLE_OAUTH_CLIENT_ID?: string;
  /** Google OAuth client secret (private). Set via `wrangler pages secret put`. */
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  /** Optional override for callback URL; defaults to `${origin}/api/auth/google/callback`. */
  GOOGLE_OAUTH_REDIRECT_URI?: string;
  /**
   * Comma-separated list of Gmail addresses that get auto-promoted to admin
   * on their first verified Google OAuth login. Other auth methods
   * (email/password) are NOT auto-promoted since email ownership is unverified.
   * Example: "owner@gmail.com,partner@gmail.com"
   */
  ADMIN_EMAILS?: string;
  /**
   * Resend API key for outbound email (membership order confirmations).
   * If unset, email-sending is a no-op and the order flow still succeeds.
   * Set via `wrangler pages secret put RESEND_API_KEY`.
   */
  RESEND_API_KEY?: string;
  /**
   * Override the "From" address used for outbound email.
   * Defaults to "MWA Korea <onboarding@resend.dev>" (Resend sandbox, works
   * without domain verification). Switch to your own domain once verified,
   * e.g. "MWA Korea <noreply@mwf.co.kr>".
   */
  RESEND_FROM?: string;
}

declare namespace App {
  interface Locals extends Runtime {
    user?: {
      id: number;
      email: string;
      name: string;
      role: "member" | "admin";
    } | null;
  }
}
