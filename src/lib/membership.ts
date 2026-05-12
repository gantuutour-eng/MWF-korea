export type PlanId = "6m" | "1y";

export interface MembershipPlan {
  id: PlanId;
  months: number;
  monthlyPrice: number;
  totalPrice: number;
  /** Long display label: e.g., '6 сарын эрх' */
  label: string;
  /** Uppercase header label: e.g., '6 САРЫН ЭРХ' */
  shortLabel: string;
  /** Number shown inside the calendar tile (6 or 12). */
  calendarNumber: number;
  /** Tailwind tone for the card visuals. */
  tone: "pink" | "purple";
  badgeText?: string;
}

export const PLANS: MembershipPlan[] = [
  {
    id: "6m",
    months: 6,
    monthlyPrice: 10000,
    totalPrice: 60000,
    label: "6 сарын эрх",
    shortLabel: "6 САРЫН ЭРХ",
    calendarNumber: 6,
    tone: "pink",
    badgeText: "Хамгийн түгээмэл",
  },
  {
    id: "1y",
    months: 12,
    monthlyPrice: 10000,
    totalPrice: 120000,
    label: "1 жилийн эрх",
    shortLabel: "1 ЖИЛИЙН ЭРХ",
    calendarNumber: 12,
    tone: "purple",
  },
];

export const BENEFITS: string[] = [
  "Бүх контентод хандалт",
  "Үйл ажиллагаанд хөнгөлөлттэй оролцох",
  "Сургалт, семинар дээгүүр эрх",
  "Сар бүр шинэ мэдээлэл хүлээн авах",
];

export const COMPARISON_ROWS: { label: string; icon: string }[] = [
  {
    label: "Мэдээ, мэдээлэл үзэх",
    icon: '<path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2zM7 8h5m-5 4h5m-5 4h5" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
  },
  {
    label: "Үйл ажиллагаанд оролцох",
    icon: '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
  },
  {
    label: "Сургалт, семинар хөнгөлөлт",
    icon: '<path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
  },
  {
    label: "Сар бүр шинэ мэдээлэл",
    icon: '<path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
  },
  {
    label: "Тусгал эрх, хөнгөлөлт",
    icon: '<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
  },
];

import { getSettings, setSetting } from "./db";

export interface BankAccount {
  bank: string;
  number: string;
  holder: string;
}

/** Used when no override exists in site_settings yet. */
export const DEFAULT_BANK_ACCOUNT: BankAccount = {
  bank: "Хаан банк",
  number: "5006 0123 4567",
  holder: "MWA салбар зөвлөл",
};

const BANK_KEYS = [
  "bank.name",
  "bank.account_number",
  "bank.account_holder",
] as const;

export async function getBankAccount(db: D1Database): Promise<BankAccount> {
  const s = await getSettings(db, [...BANK_KEYS]);
  return {
    bank: s["bank.name"] ?? DEFAULT_BANK_ACCOUNT.bank,
    number: s["bank.account_number"] ?? DEFAULT_BANK_ACCOUNT.number,
    holder: s["bank.account_holder"] ?? DEFAULT_BANK_ACCOUNT.holder,
  };
}

export async function setBankAccount(
  db: D1Database,
  data: BankAccount,
): Promise<void> {
  await setSetting(db, "bank.name", data.bank);
  await setSetting(db, "bank.account_number", data.number);
  await setSetting(db, "bank.account_holder", data.holder);
}

export const ALT_PAYMENT_METHODS: { id: string; label: string; subtitle: string; badge: string }[] = [
  { id: "card", label: "Банкны карт", subtitle: "Visa, Mastercard, UnionPay", badge: "Тун удахгүй" },
  { id: "khan", label: "Хаан банк", subtitle: "Интернэт банкаар төлөх", badge: "Тун удахгүй" },
  { id: "golomt", label: "Голомт банк", subtitle: "Интернэт банкаар төлөх", badge: "Тун удахгүй" },
  { id: "qr", label: "QR кодоор төлөх", subtitle: "Бүх банкны апп-тай", badge: "Тун удахгүй" },
  { id: "other", label: "Бусад төлбөрийн арга", subtitle: "Дараа төлбөр, Уринсуулнэлт зэрэг", badge: "Тун удахгүй" },
];

export function getPlan(id: string): MembershipPlan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** MWA-XXXXXX where X is alphanumeric, easy to read (no I/O/0/1). */
export function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let suffix = "";
  for (const b of bytes) suffix += chars[b % chars.length];
  return `MWA-${suffix}`;
}

export function formatTugrik(amount: number): string {
  return `${amount.toLocaleString("en-US")}₮`;
}

export function formatDateRangeFromNow(months: number): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);
  const fmt = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(now), end: fmt(end) };
}
