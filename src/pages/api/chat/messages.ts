import type { APIRoute } from "astro";
import {
  listChatMessages,
  createChatMessage,
  markChatRead,
  getUserById,
} from "../../../lib/db";
import { loadCurrentUser } from "../../../lib/auth";

const MAX_BODY = 2000;

export const GET: APIRoute = async ({ request, locals, url }) => {
  const env = locals.runtime.env;
  const me = await loadCurrentUser(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!me) return json({ error: "нэвтэрсэн байх шаардлагатай" }, 401);

  // Admin can specify which conversation to read via ?user_id; regular users only see their own.
  let targetUserId = me.id;
  if (me.role === "admin") {
    const param = url.searchParams.get("user_id");
    if (param) {
      const parsed = Number(param);
      if (!Number.isFinite(parsed)) return json({ error: "invalid user_id" }, 400);
      targetUserId = parsed;
    }
  }

  const afterId = Math.max(Number(url.searchParams.get("after") ?? 0), 0);
  const messages = await listChatMessages(env.DB, targetUserId, afterId);

  // Mark unread messages from the other side as read.
  // Only mark on the "initial" fetch (afterId === 0), to avoid races.
  if (afterId === 0) {
    await markChatRead(env.DB, targetUserId, me.role);
  }

  return json({ messages, viewer_role: me.role, viewer_id: me.id }, 200);
};

interface CreateBody {
  body?: string;
  user_id?: number; // required when author is admin
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadCurrentUser(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!me) return json({ error: "нэвтэрсэн байх шаардлагатай" }, 401);

  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const body = payload.body?.trim();
  if (!body) return json({ error: "хоосон зурвас илгээх боломжгүй" }, 400);
  if (body.length > MAX_BODY)
    return json({ error: `${MAX_BODY} тэмдэгтээс хэтэрсэн` }, 400);

  let targetUserId: number;
  if (me.role === "admin") {
    const userId = Number(payload.user_id);
    if (!Number.isFinite(userId))
      return json({ error: "user_id шаардлагатай" }, 400);
    const target = await getUserById(env.DB, userId);
    if (!target) return json({ error: "хэрэглэгч олдсонгүй" }, 404);
    if (target.role === "admin")
      return json({ error: "админд зурвас илгээх боломжгүй" }, 400);
    targetUserId = userId;
  } else {
    targetUserId = me.id;
  }

  const id = await createChatMessage(env.DB, {
    user_id: targetUserId,
    author_id: me.id,
    author_role: me.role,
    body,
  });

  return json({ ok: true, id }, 201);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
