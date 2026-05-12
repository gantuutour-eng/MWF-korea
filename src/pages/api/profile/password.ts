import type { APIRoute } from "astro";
import {
  loadCurrentUser,
  verifyPassword,
  hashPassword,
} from "../../../lib/auth";
import { updateUserPassword } from "../../../lib/db";

interface PostBody {
  current_password?: string;
  new_password?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadCurrentUser(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!me) return json({ error: "нэвтэрсэн байх шаардлагатай" }, 401);

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const newPassword = body.new_password ?? "";
  if (newPassword.length < 8) {
    return json({ error: "Шинэ нууц үг 8+ тэмдэгт байна" }, 400);
  }
  if (newPassword.length > 200) {
    return json({ error: "Шинэ нууц үг хэт урт" }, 400);
  }

  // If user already has a password, require current to be correct.
  if (me.password_hash) {
    const current = body.current_password ?? "";
    if (!current) {
      return json({ error: "Одоогийн нууц үгээ оруулна уу" }, 400);
    }
    const ok = await verifyPassword(current, me.password_hash);
    if (!ok) return json({ error: "Одоогийн нууц үг буруу" }, 401);
  }
  // Google-only users (no password) can SET a password without providing current.

  const hash = await hashPassword(newPassword);
  await updateUserPassword(env.DB, me.id, hash);

  return json({ ok: true }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
