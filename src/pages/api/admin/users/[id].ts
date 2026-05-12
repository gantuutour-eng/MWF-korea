import type { APIRoute } from "astro";
import { getUserById, updateUserRole } from "../../../../lib/db";
import { loadAdmin } from "../../../../lib/adminAuth";

interface PatchBody {
  role?: "member" | "admin";
}

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(
    env.DB,
    env.SESSIONS,
    request.headers.get("cookie"),
  );
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ error: "invalid id" }, 400);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (body.role !== "member" && body.role !== "admin") {
    return json({ error: "role must be member|admin" }, 400);
  }

  const target = await getUserById(env.DB, id);
  if (!target) return json({ error: "хэрэглэгч олдсонгүй" }, 404);

  // Safety: don't demote yourself; don't touch the dev admin sentinel.
  if (target.id === me.id) {
    return json({ error: "өөрийн эрхээ өөрчилж болохгүй" }, 400);
  }
  if (target.email === "dev@admin.local") {
    return json({ error: "Dev Admin-ын эрхийг өөрчилж болохгүй" }, 400);
  }

  const ok = await updateUserRole(env.DB, id, body.role);
  if (!ok) return json({ error: "өөрчлөгдсөнгүй" }, 500);
  return json({ ok: true, id, role: body.role }, 200);
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
