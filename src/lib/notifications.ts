import { listNews, listEvents } from "./db";

export type NotificationKind = "news" | "event";

export interface NotificationItem {
  kind: NotificationKind;
  title: string;
  subtitle: string | null;
  href: string;
  /**
   * Unix seconds — used both for sorting and for the "new since last seen"
   * red-dot comparison done client-side.
   */
  at: number;
  thumbnail: string | null;
}

/**
 * Collect a compact feed for the header bell drawer. Currently surfaces the
 * latest news posts and nearest upcoming events; logged-in extras (chat,
 * payment status) can be appended later without changing the call sites.
 */
export async function loadNotifications(
  db: D1Database,
): Promise<{ items: NotificationItem[]; latestAt: number }> {
  const items: NotificationItem[] = [];

  const news = await listNews(db, { limit: 5 });
  for (const n of news) {
    items.push({
      kind: "news",
      title: n.title,
      subtitle: n.subtitle,
      href: `/news/${n.id}`,
      at: n.published_at,
      thumbnail: n.cover_url ?? n.image_url ?? null,
    });
  }

  const events = await listEvents(db, { when: "upcoming" });
  for (const e of events.slice(0, 5)) {
    items.push({
      kind: "event",
      title: e.title,
      subtitle: e.location,
      href: `/events/${e.id}`,
      at: e.start_at,
      thumbnail: e.image_url,
    });
  }

  items.sort((a, b) => b.at - a.at);
  const top = items.slice(0, 10);
  const latestAt = top[0]?.at ?? 0;
  return { items: top, latestAt };
}
