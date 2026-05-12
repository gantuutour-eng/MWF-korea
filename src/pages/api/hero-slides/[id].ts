import type { APIRoute } from "astro";
import { deleteHeroSlide } from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

const MEDIA_PREFIX = "/api/media/";

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  const removed = await deleteHeroSlide(env.DB, id);
  if (!removed) return json({ error: "not found" }, 404);

  // Best-effort cleanup of the R2 object if this slide pointed to an uploaded
  // image. We don't fail the response if R2 delete fails.
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

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
