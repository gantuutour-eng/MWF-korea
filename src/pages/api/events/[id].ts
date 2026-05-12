import type { APIRoute } from "astro";
import {
  getEvent,
  deleteEvent,
  updateEvent,
  EVENT_TYPES,
  type EventType,
} from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const GET: APIRoute = async ({ params, locals }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);
  const row = await getEvent(locals.runtime.env.DB, id);
  if (!row) return json({ error: "not found" }, 404);
  return json({ event: row }, 200);
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  const existing = await getEvent(env.DB, id);
  if (!existing) return json({ error: "not found" }, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "multipart/form-data шаардлагатай" }, 400);
  }

  const title = String(form.get("title") ?? "").trim();
  if (!title) return json({ error: "title шаардлагатай" }, 400);

  const typeRaw = String(form.get("type") ?? "");
  if (!EVENT_TYPES.includes(typeRaw as EventType)) {
    return json({ error: "type буруу" }, 400);
  }

  const start = Number(form.get("start_at"));
  if (!Number.isFinite(start)) return json({ error: "start_at буруу" }, 400);

  const endRaw = String(form.get("end_at") ?? "");
  const end = endRaw ? Number(endRaw) : null;
  if (end !== null && !Number.isFinite(end)) {
    return json({ error: "end_at буруу" }, 400);
  }

  // image_url stays as existing unless a new file is uploaded or `clear_image=1`.
  let imageUrl: string | null | undefined = undefined;
  const clearImage = String(form.get("clear_image") ?? "") === "1";
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
    imageUrl = `/api/media/${key}`;
  } else if (clearImage) {
    imageUrl = null;
  }

  await updateEvent(env.DB, id, {
    type: typeRaw as EventType,
    title,
    description: String(form.get("description") ?? "").trim() || null,
    location: String(form.get("location") ?? "").trim() || null,
    start_at: start,
    end_at: end,
    ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
  });

  return json({ ok: true, id }, 200);
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);
  const removed = await deleteEvent(env.DB, id);
  if (!removed) return json({ error: "not found" }, 404);
  return json({ ok: true }, 200);
};

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
