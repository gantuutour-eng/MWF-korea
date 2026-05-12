import type { APIRoute } from "astro";

const STATE_COOKIE = "mwa_oauth_state";
const NEXT_COOKIE = "mwa_oauth_next";

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeNext(value: string | null): string {
  if (!value) return "/profile";
  if (!value.startsWith("/") || value.startsWith("//")) return "/profile";
  return value;
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = locals.runtime.env;
  if (!env.GOOGLE_OAUTH_CLIENT_ID) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_OAUTH_CLIENT_ID тохируулагдаагүй" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const next = safeNext(url.searchParams.get("next"));
  const state = randomState();

  const redirectUri =
    env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${new URL(request.url).origin}/api/auth/google/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const headers = new Headers();
  headers.set("location", authUrl.toString());
  headers.append(
    "set-cookie",
    `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  headers.append(
    "set-cookie",
    `${NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );

  return new Response(null, { status: 302, headers });
};
