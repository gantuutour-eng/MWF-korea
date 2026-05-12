import type { APIRoute } from "astro";
import { getNews } from "../../../lib/db";

export const GET: APIRoute = async ({ params, locals }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: "invalid id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const row = await getNews(locals.runtime.env.DB, id);
  if (!row) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ news: row }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
