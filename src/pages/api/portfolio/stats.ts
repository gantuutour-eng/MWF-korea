import type { APIRoute } from "astro";
import {
  listPortfolioStats,
  createPortfolioStat,
  PORTFOLIO_TONES,
  type PortfolioTone,
} from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

export const GET: APIRoute = async ({ locals }) => {
  const rows = await listPortfolioStats(locals.runtime.env.DB);
  return new Response(JSON.stringify({ stats: rows }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

interface CreateBody {
  value?: string;
  label?: string;
  tone?: PortfolioTone;
  sort_order?: number;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const value = body.value?.trim();
  const label = body.label?.trim();
  if (!value || !label)
    return json({ error: "value, label шаардлагатай" }, 400);

  const tone: PortfolioTone = PORTFOLIO_TONES.includes(
    body.tone as PortfolioTone,
  )
    ? (body.tone as PortfolioTone)
    : "purple";
  const sort_order =
    typeof body.sort_order === "number" ? body.sort_order : 999;

  const id = await createPortfolioStat(env.DB, {
    value,
    label,
    tone,
    sort_order,
  });

  return json({ ok: true, id }, 201);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
