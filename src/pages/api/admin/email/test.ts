import type { APIRoute } from "astro";
import { loadAdmin } from "../../../../lib/adminAuth";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "MWA Korea <onboarding@resend.dev>";

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  return json(
    {
      configured: !!env.RESEND_API_KEY,
      from: env.RESEND_FROM || DEFAULT_FROM,
      adminEmail: me.email,
    },
    200,
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const me = await loadAdmin(env.DB, env.SESSIONS, request.headers.get("cookie"));
  if (!me) return json({ error: "админ эрх шаардлагатай" }, 401);

  if (!env.RESEND_API_KEY) {
    return json(
      {
        ok: false,
        error: "RESEND_API_KEY тохируулагдаагүй байна",
        hint: "Cloudflare Pages → Settings → Variables and Secrets → RESEND_API_KEY",
      },
      400,
    );
  }

  let body: { to?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const to = (body.to ?? me.email ?? "").trim();
  if (!to || !to.includes("@")) {
    return json({ ok: false, error: "Зөв имэйл хаяг шаардлагатай" }, 400);
  }

  const from = env.RESEND_FROM || DEFAULT_FROM;
  const subject = "MWA Korea — Имэйл тест илгээлт";
  const text =
    "Энэ нь админ панелаас илгээсэн имэйл тест илгээлт юм.\n\n" +
    "Энэ имэйлийг хүлээн авч байгаа бол Resend холболт амжилттай " +
    "ажиллаж байгаа гэсэн үг. Гишүүнчлэлийн захиалга баталгаажуулалтын " +
    "имэйл ч мөн адил илгээгдэх ёстой.\n\n" +
    `Илгээгч: ${from}\n` +
    `Хүлээн авагч: ${to}\n` +
    `Цаг: ${new Date().toISOString()}`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
      }),
    });
    const responseBody = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(responseBody);
    } catch {
      // not JSON — leave as raw text
    }
    if (!res.ok) {
      return json(
        {
          ok: false,
          status: res.status,
          error: "Resend API алдаа",
          resendResponse: parsed ?? responseBody,
          from,
          to,
        },
        200,
      );
    }
    return json(
      {
        ok: true,
        status: res.status,
        resendResponse: parsed ?? responseBody,
        from,
        to,
      },
      200,
    );
  } catch (e) {
    return json(
      {
        ok: false,
        error: "Сүлжээний алдаа",
        detail: String((e as Error).message ?? e),
        from,
        to,
      },
      500,
    );
  }
};

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
