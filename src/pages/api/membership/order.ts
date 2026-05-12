import type { APIRoute } from "astro";
import { getPlan, generateReference } from "../../../lib/membership";
import { createMembershipPayment } from "../../../lib/db";
import { loadCurrentUser } from "../../../lib/auth";

interface CreateBody {
  plan_id?: string;
  agreed?: boolean;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const plan = getPlan(body.plan_id ?? "");
  if (!plan) return json({ error: "invalid plan" }, 400);
  if (!body.agreed) return json({ error: "Үйлчилгээний нөхцөлийг зөвшөөрнө үү" }, 400);

  const me = await loadCurrentUser(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );

  // Retry on UNIQUE constraint collision (very unlikely with 32^6 keyspace).
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = generateReference();
    try {
      const id = await createMembershipPayment(env.DB, {
        user_id: me?.id ?? null,
        plan_id: plan.id,
        months: plan.months,
        amount: plan.totalPrice,
        reference,
      });
      return json({ ok: true, id, reference }, 201);
    } catch (e) {
      const msg = String((e as Error).message ?? "");
      if (msg.includes("UNIQUE")) continue;
      return json({ error: "захиалга үүсгэхэд алдаа" }, 500);
    }
  }
  return json({ error: "захиалга үүсгэхэд алдаа" }, 500);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
