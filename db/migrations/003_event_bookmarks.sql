-- Additive migration: per-user bookmarks for events ("Хадгалах" button).
-- Mirrors news_bookmarks.

CREATE TABLE IF NOT EXISTS event_bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER NOT NULL REFERENCES events(id),
  saved_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user_saved
  ON event_bookmarks(user_id, saved_at DESC);
