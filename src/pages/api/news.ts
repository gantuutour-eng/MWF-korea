import type { APIRoute } from "astro";
import {
  listNews,
  createNews,
  createNewsImage,
  type NewsCategory,
} from "../../lib/db";
import { loadAdmin } from "../../lib/adminAuth";

const CATEGORIES: NewsCategory[] = ["notice", "article"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB per image
const MAX_IMAGES = 10;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

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

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const user = await loadAdmin(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!user) return json({ error: "админ эрх шаардлагатай" }, 401);

  const contentType = request.headers.get("content-type") ?? "";

  // Backwards-compatible JSON path (URL-based images, e.g. seeded content).
  if (contentType.includes("application/json")) {
    let body: {
      title?: string;
      subtitle?: string;
      body?: string;
      image_url?: string | null;
      cover_url?: string | null;
      category?: NewsCategory;
    };
    try {
      body = await request.json();
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
  }

  // Multipart path — multi-image upload.
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

  const files = form.getAll("images").filter(
    (v): v is File => v instanceof File && v.size > 0,
  );
  if (files.length > MAX_IMAGES) {
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

  // Upload images to R2 first so a DB row never references a missing file.
  const uploadedUrls: string[] = [];
  const ts = Date.now();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = guessExt(file.type);
    const key = `news/${ts}-${i}-${randomSuffix()}.${ext}`;
    await env.MEDIA.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    uploadedUrls.push(`/api/media/${key}`);
  }

  // First image acts as the legacy cover/thumbnail for list/home renderers.
  const firstUrl = uploadedUrls[0] ?? null;

  const id = await createNews(env.DB, {
    title,
    subtitle,
    body: content,
    image_url: firstUrl,
    cover_url: firstUrl,
    category,
    author_id: user.id,
  });

  for (let i = 0; i < uploadedUrls.length; i++) {
    await createNewsImage(env.DB, {
      news_id: id,
      url: uploadedUrls[i],
      sort_order: i,
    });
  }

  return json({ ok: true, id, images: uploadedUrls }, 201);
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
