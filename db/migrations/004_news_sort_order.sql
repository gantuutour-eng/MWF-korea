-- Additive migration: news.sort_order for manual home-page ordering.
-- Higher value = appears earlier; default 0 falls back to chronological.

ALTER TABLE news ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_news_sort_order
  ON news(sort_order DESC, published_at DESC);
