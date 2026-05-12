import type { BankAccount, MembershipPlan } from "./membership";
import { formatTugrik } from "./membership";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "MWA Korea <onboarding@resend.dev>";

export interface OrderEmailParams {
  to: string;
  recipientName: string | null;
  plan: MembershipPlan;
  reference: string;
  amount: number;
  customerMemo: string | null;
  bank: BankAccount;
  orderUrl: string;
}

/**
 * Send the post-checkout confirmation email (in Mongolian).
 *
 * No-op when RESEND_API_KEY is unset, so the order flow keeps working in
 * dev / pre-setup. Errors are swallowed and logged — a failed email must
 * never block the order response.
 */
export async function sendOrderConfirmationEmail(
  env: { RESEND_API_KEY?: string; RESEND_FROM?: string },
  params: OrderEmailParams,
): Promise<{ sent: boolean; reason?: string }> {
  if (!env.RESEND_API_KEY) {
    return { sent: false, reason: "no api key" };
  }
  if (!params.to || !params.to.includes("@")) {
    return { sent: false, reason: "invalid recipient" };
  }

  const from = env.RESEND_FROM || DEFAULT_FROM;
  const subject = `Захиалга үүсгэгдлээ — ${params.reference}`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        html: buildHtml(params),
        text: buildText(params),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("resend send failed", res.status, body);
      return { sent: false, reason: `http ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("resend send threw", e);
    return { sent: false, reason: "exception" };
  }
}

function buildText(p: OrderEmailParams): string {
  const lines = [
    `Сайн байна уу, ${p.recipientName ?? ""}`.trim(),
    "",
    "Гишүүнчлэлийн захиалга амжилттай үүсгэгдлээ. Доорх дансанд төлбөрөө шилжүүлснээр баталгаажуулалт хийгдэнэ.",
    "",
    "─── Захиалгын мэдээлэл ───",
    `Захиалгын дугаар: ${p.reference}`,
    `Багц:             ${p.plan.label}`,
    `Хугацаа:          ${p.plan.months} сар`,
    `Нийт төлбөр:      ${formatTugrik(p.amount)}`,
    "",
    "─── Шилжүүлэх данс ───",
    `Банк:             ${p.bank.bank}`,
    `Дансны дугаар:    ${p.bank.number}`,
    `Дансны эзэн:      ${p.bank.holder}`,
    "",
    `Гүйлгээний утга:  ${p.customerMemo ?? "(өөрийн нэрээ оруулна уу)"}`,
    "",
    "ВАЖНО: Гүйлгээний утга талбарт ЗААВАЛ өөрийн нэрээ оруулна уу — энэ нь таны төлбөрийг таних боломжтой болгоно. Нэг ажлын өдрийн дотор баталгаажуулна.",
    "",
    `Захиалгын статус: ${p.orderUrl}`,
    "",
    "Асуудал гарвал manuhad.mwa@gmail.com эсвэл апп доторх чат руу хандана уу.",
    "",
    "Монголын Эмэгтэйчүүдийн Холбооны БНСУ дахь салбар зөвлөл",
  ];
  return lines.join("\n");
}

function buildHtml(p: OrderEmailParams): string {
  const memo = escapeHtml(p.customerMemo ?? "(өөрийн нэрээ оруулна уу)");
  return `<!doctype html>
<html lang="mn">
<head>
<meta charset="utf-8" />
<title>Захиалгын баталгаажуулалт</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1c1e;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="background:#8b004b;color:#fff;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
    <div style="font-size:14px;letter-spacing:1px;opacity:.8;">MONGOLIAN WOMEN'S ASSOCIATION</div>
    <div style="font-size:18px;font-weight:800;margin-top:4px;">БНСУ дахь салбар зөвлөл</div>
  </div>

  <div style="background:#fff;padding:28px 24px;border-radius:0 0 16px 16px;border:1px solid #ececec;border-top:none;">
    <h1 style="font-size:18px;margin:0 0 8px 0;color:#1a1c1e;">
      Сайн байна уу${p.recipientName ? `, ${escapeHtml(p.recipientName)}` : ""}
    </h1>
    <p style="margin:0 0 20px 0;font-size:14px;color:#44474e;line-height:1.6;">
      Таны гишүүнчлэлийн захиалга амжилттай үүсгэгдлээ.
      Доорх дансанд төлбөрөө шилжүүлснээр <strong>нэг ажлын өдрийн дотор баталгаажуулагдана.</strong>
    </p>

    <!-- Order summary -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#faf8f9;border-radius:12px;margin-bottom:16px;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #f0e8eb;">
        <div style="font-size:11px;color:#888;">Захиалгын дугаар</div>
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:16px;font-weight:700;color:#8b004b;margin-top:2px;">${escapeHtml(p.reference)}</div>
      </td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #f0e8eb;">
        <div style="font-size:11px;color:#888;">Багц</div>
        <div style="font-size:14px;font-weight:600;margin-top:2px;">${escapeHtml(p.plan.label)} — ${p.plan.months} сар</div>
      </td></tr>
      <tr><td style="padding:14px 16px;">
        <div style="font-size:11px;color:#888;">Нийт төлбөр</div>
        <div style="font-size:20px;font-weight:800;color:#8b004b;margin-top:2px;">${escapeHtml(formatTugrik(p.amount))}</div>
      </td></tr>
    </table>

    <!-- Bank info -->
    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:#44474e;margin:20px 0 8px 0;">Шилжүүлэх данс</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #ececec;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:14px 16px;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11px;color:#888;">Банк</div>
        <div style="font-size:14px;font-weight:700;margin-top:2px;">${escapeHtml(p.bank.bank)}</div>
      </td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11px;color:#888;">Дансны дугаар</div>
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:700;margin-top:2px;">${escapeHtml(p.bank.number)}</div>
      </td></tr>
      <tr><td style="padding:14px 16px;border-bottom:1px solid #f0f0f0;">
        <div style="font-size:11px;color:#888;">Дансны эзэн</div>
        <div style="font-size:14px;font-weight:700;margin-top:2px;">${escapeHtml(p.bank.holder)}</div>
      </td></tr>
      <tr><td style="padding:14px 16px;background:#faf3f6;">
        <div style="font-size:11px;color:#8b004b;font-weight:700;">⚠ Гүйлгээний утга (заавал)</div>
        <div style="font-size:15px;font-weight:800;color:#8b004b;margin-top:2px;">${memo}</div>
        <div style="font-size:11px;color:#666;margin-top:6px;line-height:1.5;">
          Гүйлгээний утга талбарт <strong>өөрийн нэрээ</strong> заавал оруулна уу — энэ нь таны төлбөрийг таниулна.
        </div>
      </td></tr>
    </table>

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0 8px 0;">
      <a href="${escapeAttr(p.orderUrl)}" style="display:inline-block;background:#8b004b;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px;font-size:14px;">
        Захиалгын статус харах
      </a>
    </div>

    <p style="margin:24px 0 0 0;font-size:12px;color:#888;line-height:1.6;text-align:center;">
      Асуудал гарвал апп доторх чатаар хандана уу.<br/>
      Энэхүү имэйл нь автомат илгээгдсэн тул хариу бичих шаардлагагүй.
    </p>
  </div>

  <div style="text-align:center;margin-top:16px;font-size:11px;color:#999;">
    Монголын Эмэгтэйчүүдийн Холбооны БНСУ дахь салбар зөвлөл · 1924 оноос
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
