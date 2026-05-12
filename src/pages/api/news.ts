import type { APIRoute } from "astro";
import { listNews, createNews, type NewsCategory } from "../../lib/db";
import { loadAdmin } from "../../lib/adminAuth";

const CATEGORIES: NewsCategory[] = ["notice", "article"];

export const GET: APIRoute = async ({ locals, url }) => {
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const categoryParam = url.searchParams.get("category");
  const category = CATEGORIES.includes(categoryParam as NewsCategory)
    ? (categoryParam as NewsCategory)
    : undefined;

  const rows = await listNews(locals.runtime.env.DB, {
    limit,
    offset,
    category,
  });
  return new Response(JSON.stringify({ news: rows }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

interface CreateBody {
  title?: string;
  subtitle?: string;
  body?: string;
  image_url?: string | null;
  cover_url?: string | null;
  category?: NewsCategory;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await loadAdmin(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!user) return json({ error: "админ эрх шаардлагатай" }, 401);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const title = body.title?.trim();
  const content = body.body?.trim();
  const subtitle = body.subtitle?.trim() || null;
  const category = body.category ?? "notice";
  if (!title || !content) return json({ error: "title, body шаардлагатай" }, 400);
  if (!CATEGORIES.includes(category)) {
    return json({ error: "category must be notice|article" }, 400);
  }

  const id = await createNews(env.DB, {
    title,
    subtitle,
    body: content,
    image_url: body.image_url ?? null,
    cover_url: body.cover_url ?? null,
    category,
    author_id: user.id,
  });

  return json({ ok: true, id }, 201);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
