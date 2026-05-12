import type { APIRoute } from "astro";
import { listChatConversations } from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const conversations = await listChatConversations(env.DB);
  return json({ conversations }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
