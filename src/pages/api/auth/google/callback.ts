import type { APIRoute } from "astro";
import {
  getUserByEmail,
  getUserByGoogleId,
  linkUserGoogleId,
  createUser,
} from "../../../../lib/db";
import { startSession, sessionCookie } from "../../../../lib/auth";

const STATE_COOKIE = "mwa_oauth_state";
const NEXT_COOKIE = "mwa_oauth_next";

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) return pair.slice(idx + 1).trim();
  }
  return null;
}

function clearCookieHeader(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function errorRedirect(message: string): Response {
  const headers = new Headers();
  headers.set(
    "location",
    `/profile/login?error=${encodeURIComponent(message)}`,
  );
  headers.append("set-cookie", clearCookieHeader(STATE_COOKIE));
  headers.append("set-cookie", clearCookieHeader(NEXT_COOKIE));
  return new Response(null, { status: 302, headers });
}

export const GET: APIRoute = async ({ request, url, locals }) => {
  const env = locals.runtime.env;
  const cookieHeader = request.headers.get("cookie");

  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return errorRedirect("Google OAuth тохируулагдаагүй");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return errorRedirect(`Google: ${oauthError}`);
  if (!code || !state) return errorRedirect("invalid callback");

  const expectedState = readCookie(cookieHeader, STATE_COOKIE);
  if (!expectedState || expectedState !== state) {
    return errorRedirect("CSRF check failed");
  }

  const nextRaw = readCookie(cookieHeader, NEXT_COOKIE);
  const next = nextRaw
    ? decodeURIComponent(nextRaw).startsWith("/")
      ? decodeURIComponent(nextRaw)
      : "/profile"
    : "/profile";

  const redirectUri =
    env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${new URL(request.url).origin}/api/auth/google/callback`;

  // 1) Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    return errorRedirect(tokenJson.error_description ?? "token exchange failed");
  }

  // 2) Fetch profile via /userinfo (simpler than decoding the id_token JWT)
  const userRes = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { authorization: `Bearer ${tokenJson.access_token}` } },
  );
  if (!userRes.ok) return errorRedirect("userinfo fetch failed");
  const profile = (await userRes.json()) as GoogleUserInfo;

  if (!profile.email || !profile.sub) {
    return errorRedirect("invalid profile");
  }

  // 3) Resolve to a user: by google_id, then by email (link), then create new
  let user = await getUserByGoogleId(env.DB, profile.sub);
  if (!user) {
    const byEmail = await getUserByEmail(
      env.DB,
      profile.email.toLowerCase(),
    );
    if (byEmail) {
      await linkUserGoogleId(env.DB, byEmail.id, profile.sub, profile.picture ?? null);
      user = { ...byEmail, google_id: profile.sub, avatar_url: profile.picture ?? byEmail.avatar_url };
    } else {
      const name =
        profile.name?.trim() ||
        [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
        profile.email.split("@")[0]!;
      const id = await createUser(env.DB, {
        email: profile.email.toLowerCase(),
        password_hash: null,
        name,
        google_id: profile.sub,
        avatar_url: profile.picture ?? null,
      });
      user = {
        id,
        email: profile.email.toLowerCase(),
        password_hash: null,
        google_id: profile.sub,
        name,
        phone: null,
        avatar_url: profile.picture ?? null,
        joined_at: Math.floor(Date.now() / 1000),
        role: "member",
      };
    }
  }

  // 4) Start session
  const token = await startSession(env.SESSIONS, user.id);

  const headers = new Headers();
  headers.set("location", next);
  headers.append("set-cookie", sessionCookie(token));
  headers.append("set-cookie", clearCookieHeader(STATE_COOKIE));
  headers.append("set-cookie", clearCookieHeader(NEXT_COOKIE));
  return new Response(null, { status: 302, headers });
};
