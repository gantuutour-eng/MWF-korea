import type { APIRoute } from "astro";
import { getEvent, deleteEvent } from "../../../lib/db";
import { loadAdmin } from "../../../lib/adminAuth";

export const GET: APIRoute = async ({ params, locals }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: "invalid id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const row = await getEvent(locals.runtime.env.DB, id);
  if (!row) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ event: row }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) {
    return new Response(JSON.stringify({ error: "админ эрх шаардлагатай" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: "invalid id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const removed = await deleteEvent(env.DB, id);
  if (!removed) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
