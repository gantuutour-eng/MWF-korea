import type { APIRoute } from "astro";
import {
  confirmMembershipPayment,
  rejectMembershipPayment,
} from "../../../../lib/db";
import { loadAdmin } from "../../../../lib/adminAuth";

interface ActionBody {
  action?: "confirm" | "reject";
  note?: string;
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const note = body.note?.trim() || null;
  if (body.action === "confirm") {
    const row = await confirmMembershipPayment(env.DB, id, note);
    if (!row) return json({ error: "not found" }, 404);
    return json({ ok: true, order: row }, 200);
  }
  if (body.action === "reject") {
    const row = await rejectMembershipPayment(env.DB, id, note);
    if (!row) return json({ error: "not found" }, 404);
    return json({ ok: true, order: row }, 200);
  }
  return json({ error: "action must be confirm|reject" }, 400);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
