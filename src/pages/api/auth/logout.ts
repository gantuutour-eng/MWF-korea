import type { APIRoute } from "astro";
import {
  readSessionToken,
  endSession,
  clearSessionCookie,
} from "../../../lib/auth";

/**
 * Logout endpoint. Two response shapes depending on the caller:
 *
 *  - Form submission from the profile page (the common case): respond with
 *    a 303 See Other so the browser navigates to `/`. The previous JSON
 *    body was confusing because users landed on a bare {"ok":true} page.
 *  - fetch() with `Accept: application/json`: respond with `{ "ok": true }`
 *    for any JS-driven callers that need the success signal.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const token = readSessionToken(request.headers.get("cookie"));
  if (token) await endSession(locals.runtime.env.SESSIONS, token);

  const accept = request.headers.get("accept") ?? "";
  const wantsJson = accept.includes("application/json");

  if (wantsJson) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": clearSessionCookie(),
      },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      location: "/",
      "set-cookie": clearSessionCookie(),
    },
  });
};
