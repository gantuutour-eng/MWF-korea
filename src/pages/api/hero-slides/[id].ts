import type { APIRoute } from "astro";
import {
  deleteHeroSlide,
  getHeroSlide,
  updateHeroSlide,
} from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

const MEDIA_PREFIX = "/api/media/";
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
  const row = await getHeroSlide(locals.runtime.env.DB, id);
  if (!row) return json({ error: "not found" }, 404);
  return json({ slide: row }, 200);
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  const existing = await getHeroSlide(env.DB, id);
  if (!existing) return json({ error: "not found" }, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "multipart/form-data шаардлагатай" }, 400);
  }

  const title = String(form.get("title") ?? "").trim();
  if (!title) return json({ error: "title шаардлагатай" }, 400);

  const subtitle = String(form.get("subtitle") ?? "").trim() || null;
  const href = String(form.get("href") ?? "").trim() || null;
  const sortOrderRaw = String(form.get("sort_order") ?? "");
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : existing.sort_order;
  if (!Number.isFinite(sortOrder)) return json({ error: "sort_order буруу" }, 400);

  // Image: keep existing unless a new file uploaded OR `clear_image=1`.
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
    const key = `hero/${Date.now()}-${randomSuffix()}.${ext}`;
    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    imageUrl = `/api/media/${key}`;

    // Best-effort cleanup of the prior image if it was R2-hosted.
    if (existing.image_url && existing.image_url.startsWith(MEDIA_PREFIX)) {
      try {
        await env.MEDIA.delete(existing.image_url.slice(MEDIA_PREFIX.length));
      } catch {
        // ignore
      }
    }
  } else if (clearImage) {
    imageUrl = null;
    if (existing.image_url && existing.image_url.startsWith(MEDIA_PREFIX)) {
      try {
        await env.MEDIA.delete(existing.image_url.slice(MEDIA_PREFIX.length));
      } catch {
        // ignore
      }
    }
  }

  await updateHeroSlide(env.DB, id, {
    title,
    subtitle,
    href,
    sort_order: sortOrder,
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

  const removed = await deleteHeroSlide(env.DB, id);
  if (!removed) return json({ error: "not found" }, 404);

  if (removed.image_url && removed.image_url.startsWith(MEDIA_PREFIX)) {
    const key = removed.image_url.slice(MEDIA_PREFIX.length);
    try {
      await env.MEDIA.delete(key);
    } catch {
      // ignore
    }
  }

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
