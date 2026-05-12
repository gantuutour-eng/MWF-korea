-- Additive migration: news_images table for multi-image news posts.
-- Existing news rows continue to render via news.image_url / news.cover_url.

CREATE TABLE IF NOT EXISTS news_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL REFERENCES news(id),
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_news_images_news_sort ON news_images(news_id, sort_order);
