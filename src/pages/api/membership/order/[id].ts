import type { APIRoute } from "astro";
import {
  getMembershipPayment,
  updateMembershipMemo,
} from "../../../../lib/db";

const MAX_MEMO = 60;

export const GET: APIRoute = async ({ params, locals }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);
  const row = await getMembershipPayment(locals.runtime.env.DB, id);
  if (!row) return json({ error: "not found" }, 404);
  return json({ order: row }, 200);
};

interface PatchBody {
  customer_memo?: string;
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const row = await getMembershipPayment(locals.runtime.env.DB, id);
  if (!row) return json({ error: "not found" }, 404);
  if (row.status !== "pending")
    return json({ error: "захиалга аль хэдийн боловсруулагдсан" }, 409);

  const memoRaw = (body.customer_memo ?? "").trim();
  const memo = memoRaw === "" ? null : memoRaw.slice(0, MAX_MEMO);
  await updateMembershipMemo(locals.runtime.env.DB, id, memo);

  return json({ ok: true, customer_memo: memo }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
