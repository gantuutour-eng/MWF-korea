import type { APIRoute } from "astro";
import { getUserByEmail } from "../../../lib/db";
import { verifyPassword, startSession, sessionCookie } from "../../../lib/auth";

interface Body {
  email?: string;
  password?: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) return json({ error: "credentials required" }, 400);

  const user = await getUserByEmail(locals.runtime.env.DB, email);
  if (!user) return json({ error: "имэйл эсвэл нууц үг буруу" }, 401);

  if (!user.password_hash) {
    return json({ error: "Google-р үүсгэсэн бүртгэл. Google-оор нэвтэрнэ үү" }, 401);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return json({ error: "имэйл эсвэл нууц үг буруу" }, 401);

  const token = await startSession(locals.runtime.env.SESSIONS, user.id);
  return new Response(
    JSON.stringify({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": sessionCookie(token),
      },
    },
  );
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
