import type { APIRoute } from "astro";
import {
  listEvents,
  createEvent,
  EVENT_TYPES,
  type EventType,
} from "../../lib/db";
import { loadAdmin } from "../../lib/adminAuth";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

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

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const contentType = request.headers.get("content-type") ?? "";

  // Backwards-compatible JSON path (no image upload).
  if (contentType.includes("application/json")) {
    let body: {
      type?: string;
      title?: string;
      description?: string;
      location?: string;
      start_at?: number;
      end_at?: number;
      image_url?: string;
    };
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    return await insertEvent(env, body);
  }

  // Multipart path with image upload.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "multipart/form-data шаардлагатай" }, 400);
  }

  const startRaw = String(form.get("start_at") ?? "");
  const endRaw = String(form.get("end_at") ?? "");
  const payload: {
    type?: string;
    title?: string;
    description?: string;
    location?: string;
    start_at?: number;
    end_at?: number;
    image_url?: string;
  } = {
    type: String(form.get("type") ?? ""),
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim() || undefined,
    location: String(form.get("location") ?? "").trim() || undefined,
    start_at: startRaw ? Number(startRaw) : undefined,
    end_at: endRaw ? Number(endRaw) : undefined,
  };

  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: "Зөвхөн зураг (png, jpg, webp, gif, svg)" }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "Файл 5MB-ээс хэтэрсэн" }, 400);
    }
    const ext = guessExt(file.type);
    const key = `events/${Date.now()}-${randomSuffix()}.${ext}`;
    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    payload.image_url = `/api/media/${key}`;
  } else {
    const urlField = String(form.get("image_url") ?? "").trim();
    if (urlField) payload.image_url = urlField;
  }

  return await insertEvent(env, payload);
};

async function insertEvent(
  env: { DB: D1Database },
  body: {
    type?: string;
    title?: string;
    description?: string;
    location?: string;
    start_at?: number;
    end_at?: number;
    image_url?: string;
  },
): Promise<Response> {
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
}

function guessExt(type: string): string {
  switch (type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 8);
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
