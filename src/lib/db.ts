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
  sort_order: number;
}

const NEWS_COLS =
  "id, title, subtitle, body, image_url, cover_url, category, author_id, published_at, sort_order";

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
        `SELECT ${NEWS_COLS} FROM news WHERE category = ?1 AND id != ?2 ORDER BY sort_order DESC, published_at DESC, id DESC LIMIT ?3 OFFSET ?4`,
      )
      .bind(options.category, excludeId, limit, offset)
      .all<NewsRow>();
    return results ?? [];
  }
  const { results } = await db
    .prepare(
      `SELECT ${NEWS_COLS} FROM news WHERE id != ?1 ORDER BY sort_order DESC, published_at DESC, id DESC LIMIT ?2 OFFSET ?3`,
    )
    .bind(excludeId, limit, offset)
    .all<NewsRow>();
  return results ?? [];
}

/**
 * Assign explicit sort_order values from a list of ids in the desired
 * display order. ids[0] becomes the highest sort_order so it appears
 * first on the home page (news list query orders sort_order DESC).
 */
export async function reorderNews(
  db: D1Database,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  const stmts = ids.map((id, idx) =>
    db
      .prepare("UPDATE news SET sort_order = ?1 WHERE id = ?2")
      .bind(ids.length - idx, id),
  );
  await db.batch(stmts);
}

/**
 * Reorder hero_slides. Existing query orders sort_order ASC so ids[0]
 * needs the smallest value (0, 1, 2, ...) to render first.
 */
export async function reorderHeroSlides(
  db: D1Database,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  const stmts = ids.map((id, idx) =>
    db
      .prepare(
        "UPDATE hero_slides SET sort_order = ?1, updated_at = unixepoch() WHERE id = ?2",
      )
      .bind(idx, id),
  );
  await db.batch(stmts);
}

/** portfolio_programs query orders sort_order ASC — same convention. */
export async function reorderPortfolioPrograms(
  db: D1Database,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  const stmts = ids.map((id, idx) =>
    db
      .prepare(
        "UPDATE portfolio_programs SET sort_order = ?1, updated_at = unixepoch() WHERE id = ?2",
      )
      .bind(idx, id),
  );
  await db.batch(stmts);
}

/** portfolio_stats query orders sort_order ASC — same convention. */
export async function reorderPortfolioStats(
  db: D1Database,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  const stmts = ids.map((id, idx) =>
    db
      .prepare(
        "UPDATE portfolio_stats SET sort_order = ?1, updated_at = unixepoch() WHERE id = ?2",
      )
      .bind(idx, id),
  );
  await db.batch(stmts);
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

// ---------- News images (gallery) ----------

export interface NewsImageRow {
  id: number;
  news_id: number;
  url: string;
  sort_order: number;
  created_at: number;
}

export async function listNewsImages(
  db: D1Database,
  newsId: number,
): Promise<NewsImageRow[]> {
  const { results } = await db
    .prepare(
      "SELECT id, news_id, url, sort_order, created_at FROM news_images WHERE news_id = ?1 ORDER BY sort_order ASC, id ASC",
    )
    .bind(newsId)
    .all<NewsImageRow>();
  return results ?? [];
}

export async function createNewsImage(
  db: D1Database,
  data: {
    news_id: number;
    url: string;
    sort_order: number;
  },
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO news_images (news_id, url, sort_order) VALUES (?1, ?2, ?3)",
    )
    .bind(data.news_id, data.url, data.sort_order)
    .run();
  return result.meta.last_row_id;
}

export async function deleteNewsImages(
  db: D1Database,
  newsId: number,
): Promise<void> {
  await db
    .prepare("DELETE FROM news_images WHERE news_id = ?1")
    .bind(newsId)
    .run();
}

export async function updateNews(
  db: D1Database,
  id: number,
  data: {
    title?: string;
    subtitle?: string | null;
    body?: string;
    image_url?: string | null;
    cover_url?: string | null;
    category?: NewsCategory;
  },
): Promise<void> {
  const updates: string[] = [];
  const binds: unknown[] = [];
  if (data.title !== undefined) {
    updates.push("title = ?");
    binds.push(data.title);
  }
  if (data.subtitle !== undefined) {
    updates.push("subtitle = ?");
    binds.push(data.subtitle);
  }
  if (data.body !== undefined) {
    updates.push("body = ?");
    binds.push(data.body);
  }
  if (data.image_url !== undefined) {
    updates.push("image_url = ?");
    binds.push(data.image_url);
  }
  if (data.cover_url !== undefined) {
    updates.push("cover_url = ?");
    binds.push(data.cover_url);
  }
  if (data.category !== undefined) {
    updates.push("category = ?");
    binds.push(data.category);
  }
  if (updates.length === 0) return;
  binds.push(id);
  await db
    .prepare(`UPDATE news SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

export async function deleteNews(
  db: D1Database,
  id: number,
): Promise<boolean> {
  // Wipe FK-referencing rows first (news_bookmarks, news_images).
  await db
    .prepare("DELETE FROM news_bookmarks WHERE news_id = ?1")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM news_images WHERE news_id = ?1")
    .bind(id)
    .run();
  const res = await db
    .prepare("DELETE FROM news WHERE id = ?1")
    .bind(id)
    .run();
  return res.meta.changes > 0;
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

/** Events whose start_at falls within [startUnix, endUnix). */
export async function listEventsInRange(
  db: D1Database,
  startUnix: number,
  endUnix: number,
): Promise<EventRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${EVENT_COLS} FROM events WHERE start_at >= ?1 AND start_at < ?2 ORDER BY start_at ASC`,
    )
    .bind(startUnix, endUnix)
    .all<EventRow>();
  return results ?? [];
}

export async function deleteEvent(
  db: D1Database,
  id: number,
): Promise<boolean> {
  // Wipe FK-referencing rows first.
  await db
    .prepare("DELETE FROM event_registrations WHERE event_id = ?1")
    .bind(id)
    .run();
  await db
    .prepare("DELETE FROM event_bookmarks WHERE event_id = ?1")
    .bind(id)
    .run();
  const result = await db
    .prepare("DELETE FROM events WHERE id = ?1")
    .bind(id)
    .run();
  return result.meta.changes > 0;
}

export async function updateEvent(
  db: D1Database,
  id: number,
  data: {
    type?: EventType;
    title?: string;
    description?: string | null;
    location?: string | null;
    start_at?: number;
    end_at?: number | null;
    image_url?: string | null;
  },
): Promise<void> {
  const updates: string[] = [];
  const binds: unknown[] = [];
  if (data.type !== undefined) {
    updates.push("type = ?");
    binds.push(data.type);
  }
  if (data.title !== undefined) {
    updates.push("title = ?");
    binds.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    binds.push(data.description);
  }
  if (data.location !== undefined) {
    updates.push("location = ?");
    binds.push(data.location);
  }
  if (data.start_at !== undefined) {
    updates.push("start_at = ?");
    binds.push(data.start_at);
  }
  if (data.end_at !== undefined) {
    updates.push("end_at = ?");
    binds.push(data.end_at);
  }
  if (data.image_url !== undefined) {
    updates.push("image_url = ?");
    binds.push(data.image_url);
  }
  if (updates.length === 0) return;
  binds.push(id);
  await db
    .prepare(`UPDATE events SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

/**
 * Find the events immediately before and after the given event in
 * chronological order (by start_at, then id as tiebreaker).
 */
export async function getAdjacentEvents(
  db: D1Database,
  current: { id: number; start_at: number },
): Promise<{ prev: EventRow | null; next: EventRow | null }> {
  const prev = await db
    .prepare(
      `SELECT ${EVENT_COLS} FROM events
         WHERE (start_at < ?1) OR (start_at = ?1 AND id < ?2)
         ORDER BY start_at DESC, id DESC
         LIMIT 1`,
    )
    .bind(current.start_at, current.id)
    .first<EventRow>();
  const next = await db
    .prepare(
      `SELECT ${EVENT_COLS} FROM events
         WHERE (start_at > ?1) OR (start_at = ?1 AND id > ?2)
         ORDER BY start_at ASC, id ASC
         LIMIT 1`,
    )
    .bind(current.start_at, current.id)
    .first<EventRow>();
  return { prev, next };
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

export async function updateHeroSlide(
  db: D1Database,
  id: number,
  data: {
    title?: string;
    subtitle?: string | null;
    image_url?: string | null;
    href?: string | null;
    sort_order?: number;
  },
): Promise<void> {
  const updates: string[] = [];
  const binds: unknown[] = [];
  if (data.title !== undefined) {
    updates.push("title = ?");
    binds.push(data.title);
  }
  if (data.subtitle !== undefined) {
    updates.push("subtitle = ?");
    binds.push(data.subtitle);
  }
  if (data.image_url !== undefined) {
    updates.push("image_url = ?");
    binds.push(data.image_url);
  }
  if (data.href !== undefined) {
    updates.push("href = ?");
    binds.push(data.href);
  }
  if (data.sort_order !== undefined) {
    updates.push("sort_order = ?");
    binds.push(data.sort_order);
  }
  if (updates.length === 0) return;
  updates.push("updated_at = unixepoch()");
  binds.push(id);
  await db
    .prepare(`UPDATE hero_slides SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
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

/** Membership payment row joined with the customer's user record. */
export interface MembershipPaymentWithUser extends MembershipPaymentRow {
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
}

const MP_WITH_USER_COLS = `
  mp.id, mp.user_id, mp.plan_id, mp.months, mp.amount, mp.reference,
  mp.customer_memo, mp.payment_method, mp.status, mp.created_at,
  mp.confirmed_at, mp.starts_at, mp.ends_at, mp.admin_note,
  u.name AS user_name, u.email AS user_email, u.phone AS user_phone
`;

export async function listAllMembershipPaymentsWithUser(
  db: D1Database,
  status?: MembershipPaymentStatus,
): Promise<MembershipPaymentWithUser[]> {
  if (status) {
    const { results } = await db
      .prepare(
        `SELECT ${MP_WITH_USER_COLS}
         FROM membership_payments mp
         LEFT JOIN users u ON u.id = mp.user_id
         WHERE mp.status = ?1
         ORDER BY mp.created_at DESC`,
      )
      .bind(status)
      .all<MembershipPaymentWithUser>();
    return results ?? [];
  }
  const { results } = await db
    .prepare(
      `SELECT ${MP_WITH_USER_COLS}
       FROM membership_payments mp
       LEFT JOIN users u ON u.id = mp.user_id
       ORDER BY mp.created_at DESC`,
    )
    .all<MembershipPaymentWithUser>();
  return results ?? [];
}

/** Aggregated summary stats for the payments dashboard. */
export interface PaymentSummary {
  pending_count: number;
  pending_amount: number;
  confirmed_count: number;
  confirmed_amount: number;
  active_members: number;
  this_month_amount: number;
}

export async function getPaymentSummary(
  db: D1Database,
): Promise<PaymentSummary> {
  const now = Math.floor(Date.now() / 1000);
  const monthStart = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  })();
  const row = await db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END), 0) AS pending_count,
         COALESCE(SUM(CASE WHEN status='pending' THEN amount ELSE 0 END), 0) AS pending_amount,
         COALESCE(SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END), 0) AS confirmed_count,
         COALESCE(SUM(CASE WHEN status='confirmed' THEN amount ELSE 0 END), 0) AS confirmed_amount,
         COALESCE(SUM(CASE WHEN status='confirmed' AND starts_at IS NOT NULL AND ends_at IS NOT NULL
                          AND starts_at <= ?1 AND ends_at >= ?1 THEN 1 ELSE 0 END), 0) AS active_members,
         COALESCE(SUM(CASE WHEN status='confirmed' AND confirmed_at >= ?2 THEN amount ELSE 0 END), 0) AS this_month_amount
       FROM membership_payments`,
    )
    .bind(now, monthStart)
    .first<PaymentSummary>();
  return (
    row ?? {
      pending_count: 0,
      pending_amount: 0,
      confirmed_count: 0,
      confirmed_amount: 0,
      active_members: 0,
      this_month_amount: 0,
    }
  );
}

/** One row per user with an active confirmed membership. */
export interface ActivePaidMemberRow {
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  payment_id: number;
  plan_id: string;
  amount: number;
  reference: string;
  starts_at: number;
  ends_at: number;
}

export async function listActivePaidMembers(
  db: D1Database,
): Promise<ActivePaidMemberRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const { results } = await db
    .prepare(
      `SELECT u.id AS user_id, u.name, u.email, u.phone, u.avatar_url,
              mp.id AS payment_id, mp.plan_id, mp.amount, mp.reference,
              mp.starts_at, mp.ends_at
       FROM membership_payments mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.status = 'confirmed'
         AND mp.starts_at IS NOT NULL AND mp.ends_at IS NOT NULL
         AND mp.starts_at <= ?1 AND mp.ends_at >= ?1
       GROUP BY u.id
       HAVING mp.ends_at = MAX(mp.ends_at)
       ORDER BY mp.ends_at ASC`,
    )
    .bind(now)
    .all<ActivePaidMemberRow>();
  return results ?? [];
}

// ---------- Site settings (key/value) ----------

export async function getSetting(
  db: D1Database,
  key: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT value FROM site_settings WHERE key = ?1")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(
  db: D1Database,
  key: string,
  value: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES (?1, ?2, unixepoch()) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(key, value)
    .run();
}

export async function getSettings(
  db: D1Database,
  keys: string[],
): Promise<Record<string, string | null>> {
  if (keys.length === 0) return {};
  const placeholders = keys.map((_, i) => `?${i + 1}`).join(", ");
  const { results } = await db
    .prepare(
      `SELECT key, value FROM site_settings WHERE key IN (${placeholders})`,
    )
    .bind(...keys)
    .all<{ key: string; value: string }>();
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = null;
  for (const r of results ?? []) out[r.key] = r.value;
  return out;
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

export async function updateUserInfo(
  db: D1Database,
  id: number,
  data: { name?: string; phone?: string | null },
): Promise<void> {
  const updates: string[] = [];
  const binds: unknown[] = [];
  if (data.name !== undefined) {
    updates.push("name = ?");
    binds.push(data.name);
  }
  if (data.phone !== undefined) {
    updates.push("phone = ?");
    binds.push(data.phone);
  }
  if (updates.length === 0) return;
  binds.push(id);
  await db
    .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

export async function updateUserPassword(
  db: D1Database,
  id: number,
  passwordHash: string,
): Promise<void> {
  await db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .bind(passwordHash, id)
    .run();
}

// ---------- News bookmarks ----------

export async function isNewsBookmarked(
  db: D1Database,
  userId: number,
  newsId: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 AS x FROM news_bookmarks WHERE user_id = ?1 AND news_id = ?2",
    )
    .bind(userId, newsId)
    .first<{ x: number }>();
  return row !== null;
}

export async function toggleNewsBookmark(
  db: D1Database,
  userId: number,
  newsId: number,
): Promise<{ bookmarked: boolean }> {
  const exists = await isNewsBookmarked(db, userId, newsId);
  if (exists) {
    await db
      .prepare(
        "DELETE FROM news_bookmarks WHERE user_id = ?1 AND news_id = ?2",
      )
      .bind(userId, newsId)
      .run();
    return { bookmarked: false };
  }
  await db
    .prepare(
      "INSERT INTO news_bookmarks (user_id, news_id) VALUES (?1, ?2)",
    )
    .bind(userId, newsId)
    .run();
  return { bookmarked: true };
}

export interface NewsBookmarkRow extends NewsRow {
  saved_at: number;
}

export async function listSavedNews(
  db: D1Database,
  userId: number,
): Promise<NewsBookmarkRow[]> {
  const { results } = await db
    .prepare(
      `SELECT n.${NEWS_COLS.split(", ").join(", n.")}, b.saved_at
       FROM news_bookmarks b
       JOIN news n ON n.id = b.news_id
       WHERE b.user_id = ?1
       ORDER BY b.saved_at DESC`,
    )
    .bind(userId)
    .all<NewsBookmarkRow>();
  return results ?? [];
}

// ---------- Event registrations ----------

export async function isEventRegistered(
  db: D1Database,
  userId: number,
  eventId: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 AS x FROM event_registrations WHERE user_id = ?1 AND event_id = ?2",
    )
    .bind(userId, eventId)
    .first<{ x: number }>();
  return row !== null;
}

export async function toggleEventRegistration(
  db: D1Database,
  userId: number,
  eventId: number,
): Promise<{ registered: boolean }> {
  const exists = await isEventRegistered(db, userId, eventId);
  if (exists) {
    await db
      .prepare(
        "DELETE FROM event_registrations WHERE user_id = ?1 AND event_id = ?2",
      )
      .bind(userId, eventId)
      .run();
    return { registered: false };
  }
  await db
    .prepare(
      "INSERT INTO event_registrations (user_id, event_id) VALUES (?1, ?2)",
    )
    .bind(userId, eventId)
    .run();
  return { registered: true };
}

// ---------- Event bookmarks ----------

export async function isEventBookmarked(
  db: D1Database,
  userId: number,
  eventId: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      "SELECT 1 AS x FROM event_bookmarks WHERE user_id = ?1 AND event_id = ?2",
    )
    .bind(userId, eventId)
    .first<{ x: number }>();
  return row !== null;
}

export async function toggleEventBookmark(
  db: D1Database,
  userId: number,
  eventId: number,
): Promise<{ bookmarked: boolean }> {
  const exists = await isEventBookmarked(db, userId, eventId);
  if (exists) {
    await db
      .prepare(
        "DELETE FROM event_bookmarks WHERE user_id = ?1 AND event_id = ?2",
      )
      .bind(userId, eventId)
      .run();
    return { bookmarked: false };
  }
  await db
    .prepare(
      "INSERT INTO event_bookmarks (user_id, event_id) VALUES (?1, ?2)",
    )
    .bind(userId, eventId)
    .run();
  return { bookmarked: true };
}

export interface UserEventRow extends EventRow {
  registered_at: number;
}

export async function listMyEvents(
  db: D1Database,
  userId: number,
): Promise<UserEventRow[]> {
  const { results } = await db
    .prepare(
      `SELECT e.${EVENT_COLS.split(", ").join(", e.")}, r.registered_at
       FROM event_registrations r
       JOIN events e ON e.id = r.event_id
       WHERE r.user_id = ?1
       ORDER BY e.start_at ASC`,
    )
    .bind(userId)
    .all<UserEventRow>();
  return results ?? [];
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
