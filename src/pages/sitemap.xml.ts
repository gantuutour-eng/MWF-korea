import type { APIRoute } from "astro";
import { listNews, listEvents } from "../lib/db";

const SITE = "https://mwf.co.kr";

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

function iso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime.env.DB;

  // Static public pages.
  const entries: UrlEntry[] = [
    { loc: `${SITE}/`, changefreq: "daily", priority: 1.0 },
    { loc: `${SITE}/news`, changefreq: "daily", priority: 0.9 },
    { loc: `${SITE}/events`, changefreq: "daily", priority: 0.9 },
    { loc: `${SITE}/portfolio`, changefreq: "weekly", priority: 0.7 },
    { loc: `${SITE}/membership`, changefreq: "monthly", priority: 0.7 },
    { loc: `${SITE}/advice`, changefreq: "monthly", priority: 0.6 },
    { loc: `${SITE}/about`, changefreq: "monthly", priority: 0.6 },
    { loc: `${SITE}/chat`, changefreq: "weekly", priority: 0.3 },
    { loc: `${SITE}/privacy`, changefreq: "yearly", priority: 0.2 },
    { loc: `${SITE}/terms`, changefreq: "yearly", priority: 0.2 },
  ];

  // Dynamic content from D1.
  try {
    const news = await listNews(db, { limit: 500 });
    for (const n of news) {
      entries.push({
        loc: `${SITE}/news/${n.id}`,
        lastmod: iso(n.published_at),
        changefreq: "monthly",
        priority: 0.8,
      });
    }
  } catch {
    // If DB is unavailable, just skip dynamic entries — static still ships.
  }

  try {
    const events = await listEvents(db, { when: "all" });
    for (const e of events) {
      entries.push({
        loc: `${SITE}/events/${e.id}`,
        lastmod: iso(e.start_at),
        changefreq: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // ignore
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((e) => {
    const parts = [`  <url>`, `    <loc>${xmlEscape(e.loc)}</loc>`];
    if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
    if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
    if (e.priority !== undefined)
      parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
    parts.push(`  </url>`);
    return parts.join("\n");
  })
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
