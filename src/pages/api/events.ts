import type { APIRoute } from "astro";
import {
  listEvents,
  createEvent,
  EVENT_TYPES,
  type EventType,
} from "../../lib/db";
import { loadAdmin } from "../../lib/adminAuth";

export const GET: APIRoute = async ({ locals, url }) => {
  const typeParam = url.searchParams.get("type");
  const whenParam = url.searchParams.get("when");
  const type = EVENT_TYPES.includes(typeParam as EventType)
    ? (typeParam as EventType)
    : undefined;
  const when =
    whenParam === "upcoming" || whenParam === "past" || whenParam === "all"
      ? whenParam
      : undefined;

  const rows = await listEvents(locals.runtime.env.DB, { type, when });
  return new Response(JSON.stringify({ events: rows }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

interface CreateBody {
  type?: string;
  title?: string;
  description?: string;
  location?: string;
  start_at?: number; // unix seconds
  end_at?: number;
  image_url?: string;
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
  if (!title) return json({ error: "title шаардлагатай" }, 400);

  if (!EVENT_TYPES.includes(body.type as EventType)) {
    return json(
      { error: "type must be one of " + EVENT_TYPES.join("|") },
      400,
    );
  }
  const type = body.type as EventType;

  const start = Number(body.start_at);
  if (!Number.isFinite(start)) return json({ error: "start_at шаардлагатай" }, 400);
  const end = body.end_at !== undefined ? Number(body.end_at) : null;
  if (end !== null && !Number.isFinite(end))
    return json({ error: "end_at буруу" }, 400);

  const id = await createEvent(env.DB, {
    type,
    title,
    description: body.description?.trim() || null,
    location: body.location?.trim() || null,
    start_at: start,
    end_at: end,
    image_url: body.image_url?.trim() || null,
  });
  return json({ ok: true, id }, 201);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
