import type { APIRoute } from "astro";
import { loadCurrentUser } from "../../../lib/auth";
import { updateUserInfo } from "../../../lib/db";

interface PatchBody {
  name?: string;
  phone?: string;
}

export const PATCH: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadCurrentUser(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!me) return json({ error: "нэвтэрсэн байх шаардлагатай" }, 401);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const name = body.name?.trim();
  if (name !== undefined && name.length === 0) {
    return json({ error: "нэр хоосон байж болохгүй" }, 400);
  }
  if (name !== undefined && name.length > 60) {
    return json({ error: "нэр 60 тэмдэгтээс хэтэрсэн" }, 400);
  }

  const phoneRaw = body.phone?.trim();
  const phone =
    phoneRaw === undefined ? undefined : phoneRaw === "" ? null : phoneRaw;
  if (phone && phone.length > 30) {
    return json({ error: "утас 30 тэмдэгтээс хэтэрсэн" }, 400);
  }

  await updateUserInfo(env.DB, me.id, {
    name,
    phone,
  });

  return json({ ok: true }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
