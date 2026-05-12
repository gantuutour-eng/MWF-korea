import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params, locals }) => {
  const raw = params.key;
  const key = Array.isArray(raw) ? raw.join("/") : (raw ?? "");
  if (!key) return new Response("not found", { status: 404 });

  const obj = await locals.runtime.env.MEDIA.get(key);
  if (!obj) return new Response("not found", { status: 404 });

  const headers = new Headers();
  headers.set(
    "content-type",
    obj.httpMetadata?.contentType ?? "application/octet-stream",
  );
  headers.set("cache-control", "public, max-age=31536000, immutable");
  if (obj.httpEtag) headers.set("etag", obj.httpEtag);

  return new Response(obj.body, { status: 200, headers });
};
