import type { APIRoute } from "astro";
import { loadCurrentUser } from "../../../../lib/auth";
import { toggleEventRegistration, getEvent } from "../../../../lib/db";

export const POST: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadCurrentUser(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!me) return json({ error: "нэвтэрсэн байх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  const row = await getEvent(env.DB, id);
  if (!row) return json({ error: "арга хэмжээ олдсонгүй" }, 404);

  const result = await toggleEventRegistration(env.DB, me.id, id);
  return json({ ok: true, ...result }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
