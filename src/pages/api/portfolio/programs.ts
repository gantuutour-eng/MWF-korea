import type { APIRoute } from "astro";
import {
  listPortfolioPrograms,
  createPortfolioProgram,
  PORTFOLIO_TONES,
  type PortfolioTone,
} from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

export const GET: APIRoute = async ({ locals }) => {
  const rows = await listPortfolioPrograms(locals.runtime.env.DB);
  return new Response(JSON.stringify({ programs: rows }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

interface CreateBody {
  title?: string;
  description?: string;
  icon?: string;
  image_url?: string | null;
  tone?: PortfolioTone;
  since_label?: string | null;
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

  const title = body.title?.trim();
  const description = body.description?.trim();
  if (!title || !description)
    return json({ error: "title, description шаардлагатай" }, 400);

  const icon = body.icon?.trim() || "✨";
  const tone: PortfolioTone = PORTFOLIO_TONES.includes(
    body.tone as PortfolioTone,
  )
    ? (body.tone as PortfolioTone)
    : "purple";
  const since_label = body.since_label?.trim() || null;
  const sort_order =
    typeof body.sort_order === "number" ? body.sort_order : 999;

  const id = await createPortfolioProgram(env.DB, {
    title,
    description,
    icon,
    image_url: body.image_url ?? null,
    tone,
    since_label,
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
