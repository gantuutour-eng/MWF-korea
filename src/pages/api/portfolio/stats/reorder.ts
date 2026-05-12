import type { APIRoute } from "astro";
import { reorderPortfolioStats } from "../../../../lib/db";
import { loadAdmin } from "../../../../lib/adminAuth";

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  let body: { ids?: unknown };
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!Array.isArray(body.ids)) return json({ error: "ids массив шаардлагатай" }, 400);

  const ids = body.ids.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (ids.length === 0) return json({ error: "ids хоосон" }, 400);
  if (ids.length > 500) return json({ error: "хэт олон id" }, 400);

  await reorderPortfolioStats(env.DB, ids);
  return json({ ok: true, count: ids.length }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
