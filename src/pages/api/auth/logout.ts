import type { APIRoute } from "astro";
import {
  readSessionToken,
  endSession,
  clearSessionCookie,
} from "../../../lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
  const token = readSessionToken(request.headers.get("cookie"));
  if (token) await endSession(locals.runtime.env.SESSIONS, token);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": clearSessionCookie(),
    },
  });
};
