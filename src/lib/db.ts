export type NewsCategory = "notice" | "article";

export interface NewsRow {
  id: number;
  title: string;
  subtitle: string | null;
  body: string;
  image_url: string | null;
  cover_url: string | null;
  category: NewsCategory;
  author_id: number | null;
  published_at: number;
}

const NEWS_COLS =
  "id, title, subtitle, body, image_url, cover_url, category, author_id, published_at";

export type EventType =
  | "seminar"
  | "training"
  | "meeting"
  | "volunteer"
  | "webinar"
  | "event";

export interface EventRow {
  id: number;
  type: EventType;
  title: string;
  description: string | null;
  location: string | null;
  start_at: number;
  end_at: number | null;
  image_url: string | null;
}

export const EVENT_TYPES: EventType[] = [
  "seminar",
  "training",
  "meeting",
  "volunteer",
  "webinar",
  "event",
];

export interface UserRow {
  id: number;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  joined_at: number;
  role: "member" | "admin";
}

const USER_COLS =
  "id, email, password_hash, google_id, name, phone, avatar_url, joined_at, role";

export async function listNews(
  db: D1Database,
  options: {
    limit?: number;
    offset?: number;
    category?: NewsCategory;
    excludeId?: number;
  } = {},
): Promise<NewsRow[]> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const excludeId = options.excludeId ?? 0;
  if (options.category) {
    const { results } = await db
      .prepare(
        `SELECT ${NEWS_COLS} FROM news WHERE category = ?1 AND id != ?2 ORDER BY published_at DESC LIMIT ?3 OFFSET ?4`,
      )
      .bind(options.category, excludeId, limit, offset)
      .all<NewsRow>();
    return results ?? [];
  }
  const { results } = await db
    .prepare(
      `SELECT ${NEWS_COLS} FROM news WHERE id != ?1 ORDER BY published_at DESC LIMIT ?2 OFFSET ?3`,
    )
    .bind(excludeId, limit, offset)
    .all<NewsRow>();
  return results ?? [];
}

export async function getNews(
  db: D1Database,
  id: number,
): Promise<NewsRow | null> {
  return await db
    .prepare(`SELECT ${NEWS_COLS} FROM news WHERE id = ?1`)
    .bind(id)
    .first<NewsRow>();
}

export async function createNews(
  db: D1Database,
  data: {
    title: string;
    subtitle: string | null;
    body: string;
    image_url: string | null;
    cover_url: string | null;
    category: NewsCategory;
    author_id: number;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO news (title, subtitle, body, image_url, cover_url, category, author_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(
      data.title,
      data.subtitle,
      data.body,
      data.image_url,
      data.cover_url,
      data.category,
      data.author_id,
    )
    .run();
  return result.meta.last_row_id;
}

const EVENT_COLS =
  "id, type, title, description, location, start_at, end_at, image_url";

export async function listEvents(
  db: D1Database,
  options: {
    type?: EventType;
    when?: "upcoming" | "past" | "all";
  } = {},
): Promise<EventRow[]> {
  const when = options.when ?? "all";
  const now = Math.floor(Date.now() / 1000);

  if (options.type && when === "upcoming") {
    const { results } = await db
      .prepare(
        `SELECT ${EVENT_COLS} FROM events WHERE type = ?1 AND start_at >= ?2 ORDER BY start_at ASC`,
      )
      .bind(options.type, now)
      .all<EventRow>();
    return results ?? [];
  }
  if (options.type && when === "past") {
    const { results } = await db
      .prepare(
        `SELECT ${EVENT_COLS} FROM events WHERE type = ?1 AND start_at < ?2 ORDER BY start_at DESC`,
      )
      .bind(options.type, now)
      .all<EventRow>();
    return results ?? [];
  }
  if (options.type) {
    const { results } = await db
      .prepare(
        `SELECT ${EVENT_COLS} FROM events WHERE type = ?1 ORDER BY start_at ASC`,
      )
      .bind(options.type)
      .all<EventRow>();
    return results ?? [];
  }
  if (when === "upcoming") {
    const { results } = await db
      .prepare(
        `SELECT ${EVENT_COLS} FROM events WHERE start_at >= ?1 ORDER BY start_at ASC`,
      )
      .bind(now)
      .all<EventRow>();
    return results ?? [];
  }
  if (when === "past") {
    const { results } = await db
      .prepare(
        `SELECT ${EVENT_COLS} FROM events WHERE start_at < ?1 ORDER BY start_at DESC`,
      )
      .bind(now)
      .all<EventRow>();
    return results ?? [];
  }
  const { results } = await db
    .prepare(`SELECT ${EVENT_COLS} FROM events ORDER BY start_at ASC`)
    .all<EventRow>();
  return results ?? [];
}

export async function getEvent(
  db: D1Database,
  id: number,
): Promise<EventRow | null> {
  return await db
    .prepare(`SELECT ${EVENT_COLS} FROM events WHERE id = ?1`)
    .bind(id)
    .first<EventRow>();
}

export async function createEvent(
  db: D1Database,
  data: {
    type: EventType;
    title: string;
    description: string | null;
    location: string | null;
    start_at: number;
    end_at: number | null;
    image_url: string | null;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO events (type, title, description, location, start_at, end_at, image_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(
      data.type,
      data.title,
      data.description,
      data.location,
      data.start_at,
      data.end_at,
      data.image_url,
    )
    .run();
  return result.meta.last_row_id;
}

export async function deleteEvent(
  db: D1Database,
  id: number,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM events WHERE id = ?1")
    .bind(id)
    .run();
  return result.meta.changes > 0;
}

export interface UserSummaryRow extends UserRow {
  active_membership_ends_at: number | null;
  active_membership_plan: string | null;
}

export async function listAllUsers(
  db: D1Database,
): Promise<UserSummaryRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const { results } = await db
    .prepare(
      `SELECT
         u.id, u.email, u.password_hash, u.google_id, u.name, u.phone,
         u.avatar_url, u.joined_at, u.role,
         mp.ends_at AS active_membership_ends_at,
         mp.plan_id AS active_membership_plan
       FROM users u
       LEFT JOIN (
         SELECT user_id, ends_at, plan_id
         FROM membership_payments
         WHERE status='confirmed' AND ends_at >= ?1
         GROUP BY user_id
         HAVING ends_at = MAX(ends_at)
       ) mp ON mp.user_id = u.id
       ORDER BY u.joined_at DESC`,
    )
    .bind(now)
    .all<UserSummaryRow>();
  return results ?? [];
}

export async function updateUserRole(
  db: D1Database,
  id: number,
  role: "member" | "admin",
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE users SET role = ?1 WHERE id = ?2")
    .bind(role, id)
    .run();
  return result.meta.changes > 0;
}

export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow | null> {
  return await db
    .prepare(`SELECT ${USER_COLS} FROM users WHERE email = ?1`)
    .bind(email)
    .first<UserRow>();
}

export async function getUserById(
  db: D1Database,
  id: number,
): Promise<UserRow | null> {
  return await db
    .prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?1`)
    .bind(id)
    .first<UserRow>();
}

export async function getUserByGoogleId(
  db: D1Database,
  googleId: string,
): Promise<UserRow | null> {
  return await db
    .prepare(`SELECT ${USER_COLS} FROM users WHERE google_id = ?1`)
    .bind(googleId)
    .first<UserRow>();
}

export async function linkUserGoogleId(
  db: D1Database,
  userId: number,
  googleId: string,
  avatarUrl: string | null,
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET google_id = ?1, avatar_url = COALESCE(?2, avatar_url) WHERE id = ?3",
    )
    .bind(googleId, avatarUrl, userId)
    .run();
}

export interface HeroSlideRow {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  href: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

const HERO_COLS =
  "id, title, subtitle, image_url, href, sort_order, created_at, updated_at";

export async function listHeroSlides(
  db: D1Database,
): Promise<HeroSlideRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${HERO_COLS} FROM hero_slides ORDER BY sort_order ASC, id ASC`,
    )
    .all<HeroSlideRow>();
  return results ?? [];
}

export async function getHeroSlide(
  db: D1Database,
  id: number,
): Promise<HeroSlideRow | null> {
  return await db
    .prepare(`SELECT ${HERO_COLS} FROM hero_slides WHERE id = ?1`)
    .bind(id)
    .first<HeroSlideRow>();
}

export async function createHeroSlide(
  db: D1Database,
  data: {
    title: string;
    subtitle: string | null;
    image_url: string | null;
    href: string | null;
    sort_order: number;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO hero_slides (title, subtitle, image_url, href, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(
      data.title,
      data.subtitle,
      data.image_url,
      data.href,
      data.sort_order,
    )
    .run();
  return result.meta.last_row_id;
}

export async function deleteHeroSlide(
  db: D1Database,
  id: number,
): Promise<HeroSlideRow | null> {
  const row = await getHeroSlide(db, id);
  if (!row) return null;
  await db.prepare("DELETE FROM hero_slides WHERE id = ?1").bind(id).run();
  return row;
}

export type PortfolioTone =
  | "orange"
  | "purple"
  | "rose"
  | "emerald"
  | "blue"
  | "amber";

export const PORTFOLIO_TONES: PortfolioTone[] = [
  "orange",
  "purple",
  "rose",
  "emerald",
  "blue",
  "amber",
];

export interface PortfolioProgramRow {
  id: number;
  title: string;
  description: string;
  icon: string;
  image_url: string | null;
  tone: PortfolioTone;
  since_label: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface PortfolioStatRow {
  id: number;
  value: string;
  label: string;
  tone: PortfolioTone;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

const PROGRAM_COLS =
  "id, title, description, icon, image_url, tone, since_label, sort_order, created_at, updated_at";
const STAT_COLS =
  "id, value, label, tone, sort_order, created_at, updated_at";

export async function listPortfolioPrograms(
  db: D1Database,
): Promise<PortfolioProgramRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${PROGRAM_COLS} FROM portfolio_programs ORDER BY sort_order ASC, id ASC`,
    )
    .all<PortfolioProgramRow>();
  return results ?? [];
}

export async function createPortfolioProgram(
  db: D1Database,
  data: {
    title: string;
    description: string;
    icon: string;
    image_url: string | null;
    tone: PortfolioTone;
    since_label: string | null;
    sort_order: number;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO portfolio_programs (title, description, icon, image_url, tone, since_label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(
      data.title,
      data.description,
      data.icon,
      data.image_url,
      data.tone,
      data.since_label,
      data.sort_order,
    )
    .run();
  return result.meta.last_row_id;
}

export async function listPortfolioStats(
  db: D1Database,
): Promise<PortfolioStatRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${STAT_COLS} FROM portfolio_stats ORDER BY sort_order ASC, id ASC`,
    )
    .all<PortfolioStatRow>();
  return results ?? [];
}

export async function createPortfolioStat(
  db: D1Database,
  data: {
    value: string;
    label: string;
    tone: PortfolioTone;
    sort_order: number;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO portfolio_stats (value, label, tone, sort_order) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(data.value, data.label, data.tone, data.sort_order)
    .run();
  return result.meta.last_row_id;
}

export type ChatAuthorRole = "member" | "admin";

export interface ChatMessageRow {
  id: number;
  user_id: number;
  author_id: number;
  author_role: ChatAuthorRole;
  body: string;
  created_at: number;
  read_at: number | null;
}

export interface ChatConversationRow {
  user_id: number;
  user_name: string;
  user_email: string;
  last_body: string;
  last_author_role: ChatAuthorRole;
  last_at: number;
  unread_count: number;
}

const CHAT_COLS =
  "id, user_id, author_id, author_role, body, created_at, read_at";

export async function listChatMessages(
  db: D1Database,
  userId: number,
  afterId = 0,
): Promise<ChatMessageRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${CHAT_COLS} FROM chat_messages WHERE user_id = ?1 AND id > ?2 ORDER BY created_at ASC, id ASC`,
    )
    .bind(userId, afterId)
    .all<ChatMessageRow>();
  return results ?? [];
}

export async function createChatMessage(
  db: D1Database,
  data: {
    user_id: number;
    author_id: number;
    author_role: ChatAuthorRole;
    body: string;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO chat_messages (user_id, author_id, author_role, body) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(data.user_id, data.author_id, data.author_role, data.body)
    .run();
  return result.meta.last_row_id;
}

/**
 * Mark unread messages in this conversation as read.
 * Marks messages NOT authored by the reader role (i.e., when admin reads, marks member messages; vice versa).
 */
export async function markChatRead(
  db: D1Database,
  userId: number,
  readerRole: ChatAuthorRole,
): Promise<void> {
  const otherRole: ChatAuthorRole = readerRole === "admin" ? "member" : "admin";
  await db
    .prepare(
      "UPDATE chat_messages SET read_at = unixepoch() WHERE user_id = ?1 AND author_role = ?2 AND read_at IS NULL",
    )
    .bind(userId, otherRole)
    .run();
}

export async function listChatConversations(
  db: D1Database,
): Promise<ChatConversationRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
         m.user_id                                AS user_id,
         u.name                                   AS user_name,
         u.email                                  AS user_email,
         m.body                                   AS last_body,
         m.author_role                            AS last_author_role,
         m.created_at                             AS last_at,
         (SELECT COUNT(*) FROM chat_messages c
            WHERE c.user_id = m.user_id
              AND c.author_role = 'member'
              AND c.read_at IS NULL)              AS unread_count
       FROM chat_messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.id = (
         SELECT MAX(id) FROM chat_messages WHERE user_id = m.user_id
       )
       ORDER BY m.created_at DESC`,
    )
    .all<ChatConversationRow>();
  return results ?? [];
}

export type MembershipPaymentStatus = "pending" | "confirmed" | "rejected";

export interface MembershipPaymentRow {
  id: number;
  user_id: number | null;
  plan_id: string;
  months: number;
  amount: number;
  reference: string;
  customer_memo: string | null;
  payment_method: string;
  status: MembershipPaymentStatus;
  created_at: number;
  confirmed_at: number | null;
  starts_at: number | null;
  ends_at: number | null;
  admin_note: string | null;
}

const MP_COLS =
  "id, user_id, plan_id, months, amount, reference, customer_memo, payment_method, status, created_at, confirmed_at, starts_at, ends_at, admin_note";

export async function createMembershipPayment(
  db: D1Database,
  data: {
    user_id: number | null;
    plan_id: string;
    months: number;
    amount: number;
    reference: string;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO membership_payments (user_id, plan_id, months, amount, reference) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(
      data.user_id,
      data.plan_id,
      data.months,
      data.amount,
      data.reference,
    )
    .run();
  return result.meta.last_row_id;
}

export async function getMembershipPayment(
  db: D1Database,
  id: number,
): Promise<MembershipPaymentRow | null> {
  return await db
    .prepare(`SELECT ${MP_COLS} FROM membership_payments WHERE id = ?1`)
    .bind(id)
    .first<MembershipPaymentRow>();
}

export async function updateMembershipMemo(
  db: D1Database,
  id: number,
  memo: string | null,
): Promise<void> {
  await db
    .prepare("UPDATE membership_payments SET customer_memo = ?1 WHERE id = ?2")
    .bind(memo, id)
    .run();
}

export async function confirmMembershipPayment(
  db: D1Database,
  id: number,
  adminNote: string | null = null,
): Promise<MembershipPaymentRow | null> {
  const row = await getMembershipPayment(db, id);
  if (!row) return null;
  const now = Math.floor(Date.now() / 1000);
  const ends = now + row.months * 30 * 86400;
  await db
    .prepare(
      "UPDATE membership_payments SET status='confirmed', confirmed_at=?1, starts_at=?1, ends_at=?2, admin_note=COALESCE(?3, admin_note) WHERE id=?4",
    )
    .bind(now, ends, adminNote, id)
    .run();
  return await getMembershipPayment(db, id);
}

export async function rejectMembershipPayment(
  db: D1Database,
  id: number,
  adminNote: string | null = null,
): Promise<MembershipPaymentRow | null> {
  await db
    .prepare(
      "UPDATE membership_payments SET status='rejected', admin_note=COALESCE(?1, admin_note) WHERE id=?2",
    )
    .bind(adminNote, id)
    .run();
  return await getMembershipPayment(db, id);
}

export async function listUserMembershipPayments(
  db: D1Database,
  userId: number,
): Promise<MembershipPaymentRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${MP_COLS} FROM membership_payments WHERE user_id = ?1 ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<MembershipPaymentRow>();
  return results ?? [];
}

export async function listAllMembershipPayments(
  db: D1Database,
  status?: MembershipPaymentStatus,
): Promise<MembershipPaymentRow[]> {
  if (status) {
    const { results } = await db
      .prepare(
        `SELECT ${MP_COLS} FROM membership_payments WHERE status = ?1 ORDER BY created_at DESC`,
      )
      .bind(status)
      .all<MembershipPaymentRow>();
    return results ?? [];
  }
  const { results } = await db
    .prepare(
      `SELECT ${MP_COLS} FROM membership_payments ORDER BY created_at DESC`,
    )
    .all<MembershipPaymentRow>();
  return results ?? [];
}

/** Latest currently-active membership for a user (confirmed and within start/end window). */
export async function getActiveMembership(
  db: D1Database,
  userId: number,
): Promise<MembershipPaymentRow | null> {
  const now = Math.floor(Date.now() / 1000);
  return await db
    .prepare(
      `SELECT ${MP_COLS} FROM membership_payments
       WHERE user_id = ?1 AND status = 'confirmed'
         AND starts_at IS NOT NULL AND ends_at IS NOT NULL
         AND starts_at <= ?2 AND ends_at >= ?2
       ORDER BY ends_at DESC LIMIT 1`,
    )
    .bind(userId, now)
    .first<MembershipPaymentRow>();
}

export async function createUser(
  db: D1Database,
  data: {
    email: string;
    password_hash: string | null;
    name: string;
    phone?: string | null;
    google_id?: string | null;
    avatar_url?: string | null;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO users (email, password_hash, google_id, name, phone, avatar_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(
      data.email,
      data.password_hash,
      data.google_id ?? null,
      data.name,
      data.phone ?? null,
      data.avatar_url ?? null,
    )
    .run();
  return result.meta.last_row_id;
}
