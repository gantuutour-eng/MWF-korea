import type { APIRoute } from "astro";
import { listHeroSlides, createHeroSlide } from "../../lib/db";
import { loadAdmin } from "../../lib/adminAuth";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export const GET: APIRoute = async ({ locals }) => {
  const slides = await listHeroSlides(locals.runtime.env.DB);
  return new Response(JSON.stringify({ slides }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

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
  const sortOrderRaw = String(form.get("sort_order") ?? "100").trim();
  const sortOrder = Number(sortOrderRaw);
  if (!Number.isFinite(sortOrder)) {
    return json({ error: "sort_order буруу" }, 400);
  }

  let imageUrl: string | null = null;
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
  }

  const id = await createHeroSlide(env.DB, {
    title,
    subtitle,
    image_url: imageUrl,
    href,
    sort_order: sortOrder,
  });
  return json({ ok: true, id, image_url: imageUrl }, 201);
};

function guessExt(type: string): string {
  switch (type) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/svg+xml": return "svg";
    default: return "bin";
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
