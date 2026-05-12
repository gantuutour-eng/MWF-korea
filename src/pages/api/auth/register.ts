import type { APIRoute } from "astro";
import { createUser, getUserByEmail } from "../../../lib/db";
import { hashPassword, startSession, sessionCookie } from "../../../lib/auth";

interface Body {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
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
  const name = body.name?.trim();
  const phone = body.phone?.trim() || null;

  if (!email || !password || !name) {
    return json({ error: "email, password, name шаардлагатай" }, 400);
  }
  if (password.length < 8) {
    return json({ error: "нууц үг 8 тэмдэгтээс багагүй" }, 400);
  }

  const existing = await getUserByEmail(locals.runtime.env.DB, email);
  if (existing) return json({ error: "имэйл бүртгэлтэй байна" }, 409);

  const passwordHash = await hashPassword(password);
  const userId = await createUser(locals.runtime.env.DB, {
    email,
    password_hash: passwordHash,
    name,
    phone,
  });

  const token = await startSession(locals.runtime.env.SESSIONS, userId);
  return new Response(JSON.stringify({ ok: true, userId }), {
    status: 201,
    headers: {
      "content-type": "application/json",
      "set-cookie": sessionCookie(token),
    },
  });
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
