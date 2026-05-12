import type { APIRoute } from "astro";
import {
  getNews,
  updateNews,
  deleteNews,
  deleteNewsImages,
  createNewsImage,
  type NewsCategory,
} from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

const CATEGORIES: NewsCategory[] = ["notice", "article"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 10;
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
  const row = await getNews(locals.runtime.env.DB, id);
  if (!row) return json({ error: "not found" }, 404);
  return json({ news: row }, 200);
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  const existing = await getNews(env.DB, id);
  if (!existing) return json({ error: "not found" }, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "multipart/form-data шаардлагатай" }, 400);
  }

  const title = String(form.get("title") ?? "").trim();
  const content = String(form.get("body") ?? "").trim();
  const subtitle = String(form.get("subtitle") ?? "").trim() || null;
  const categoryRaw = String(form.get("category") ?? "notice");
  const category = CATEGORIES.includes(categoryRaw as NewsCategory)
    ? (categoryRaw as NewsCategory)
    : "notice";
  if (!title || !content) return json({ error: "title, body шаардлагатай" }, 400);

  // existing_images: comma-separated URLs to KEEP in the desired order.
  // Anything previously in the gallery but missing here gets removed.
  const keepRaw = String(form.get("existing_images") ?? "");
  const keptUrls = keepRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const files = form.getAll("images").filter(
    (v): v is File => v instanceof File && v.size > 0,
  );
  if (keptUrls.length + files.length > MAX_IMAGES) {
    return json({ error: `Хамгийн ихдээ ${MAX_IMAGES} зураг` }, 400);
  }
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: "Зөвхөн зураг (png, jpg, webp, gif, svg)" }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "Файл 5MB-ээс хэтэрсэн" }, 400);
    }
  }

  const ts = Date.now();
  const newUrls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = guessExt(file.type);
    const key = `news/${ts}-${i}-${randomSuffix()}.${ext}`;
    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    newUrls.push(`/api/media/${key}`);
  }

  const merged = [...keptUrls, ...newUrls];

  // Replace gallery rows. Orphaned R2 objects are left in place — cheap and
  // safe; they can be cleaned up later.
  await deleteNewsImages(env.DB, id);
  for (let i = 0; i < merged.length; i++) {
    await createNewsImage(env.DB, {
      news_id: id,
      url: merged[i],
      sort_order: i,
    });
  }

  const firstUrl = merged[0] ?? null;

  await updateNews(env.DB, id, {
    title,
    subtitle,
    body: content,
    image_url: firstUrl,
    cover_url: firstUrl,
    category,
  });

  return json({ ok: true, id, images: merged }, 200);
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  const removed = await deleteNews(env.DB, id);
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
