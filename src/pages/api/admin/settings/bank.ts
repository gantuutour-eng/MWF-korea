import type { APIRoute } from "astro";
import { getBankAccount, setBankAccount } from "../../../../lib/membership";
import { loadAdmin } from "../../../../lib/adminAuth";

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);
  const bank = await getBankAccount(env.DB);
  return json({ bank }, 200);
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  let body: { bank?: string; number?: string; holder?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const bank = (body.bank ?? "").trim();
  const number = (body.number ?? "").trim();
  const holder = (body.holder ?? "").trim();
  if (!bank || !number || !holder) {
    return json({ error: "Бүх талбарыг бөглөнө үү" }, 400);
  }
  if (bank.length > 80 || number.length > 80 || holder.length > 80) {
    return json({ error: "Хэт урт талбар" }, 400);
  }

  await setBankAccount(env.DB, { bank, number, holder });
  return json({ ok: true, bank: { bank, number, holder } }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
