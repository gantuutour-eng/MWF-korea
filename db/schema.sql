-- MWA Korea D1 schema
-- Apply locally:  npm run db:local
-- Apply remote:   npm run db:remote

-- Drop children before parents (FK respects referenced order)
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS event_bookmarks;
DROP TABLE IF EXISTS event_registrations;
DROP TABLE IF EXISTS news_bookmarks;
DROP TABLE IF EXISTS news_images;
DROP TABLE IF EXISTS membership_payments;
DROP TABLE IF EXISTS portfolio_programs;
DROP TABLE IF EXISTS portfolio_stats;
DROP TABLE IF EXISTS hero_slides;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                       -- NULL for OAuth-only users
  google_id TEXT UNIQUE,                    -- Google `sub` claim, if linked
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,                          -- profile picture URL (from Google or uploaded)
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  role TEXT NOT NULL DEFAULT 'member'
);

CREATE INDEX idx_users_google_id ON users(google_id);

CREATE TABLE news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                       -- main hook/question title (overlay on cover)
  subtitle TEXT,                             -- formal title shown below cover image
  body TEXT NOT NULL,
  image_url TEXT,                            -- square thumbnail for news list
  cover_url TEXT,                            -- wide hero image for home carousel + detail
  category TEXT NOT NULL DEFAULT 'notice',   -- notice | article
  author_id INTEGER REFERENCES users(id),
  published_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sort_order INTEGER NOT NULL DEFAULT 0      -- higher = appears first on home/list (manual ordering)
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at INTEGER NOT NULL,
  end_at INTEGER,
  image_url TEXT
);

CREATE TABLE portfolio_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✨',                -- emoji or short symbol
  image_url TEXT,                                  -- optional, overrides icon
  tone TEXT NOT NULL DEFAULT 'purple',             -- orange|purple|rose|emerald|blue|amber
  since_label TEXT,                                -- e.g. "2018 оноос"
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE portfolio_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value TEXT NOT NULL,                             -- "1,500+"
  label TEXT NOT NULL,                             -- "Гишүүн"
  tone TEXT NOT NULL DEFAULT 'purple',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_news_published ON news(published_at DESC);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_sort_order ON news(sort_order DESC, published_at DESC);
CREATE INDEX idx_events_start ON events(start_at);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_portfolio_programs_sort ON portfolio_programs(sort_order);
CREATE INDEX idx_portfolio_stats_sort ON portfolio_stats(sort_order);

CREATE TABLE hero_slides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                   -- supports <br/> for line breaks
  subtitle TEXT,                          -- supports <br/>
  image_url TEXT,                         -- e.g. '/api/media/hero/abc.png' (uploaded) or NULL = burgundy default
  href TEXT,                              -- click destination, optional
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_hero_slides_sort ON hero_slides(sort_order);

CREATE TABLE news_bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id),
  news_id INTEGER NOT NULL REFERENCES news(id),
  saved_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, news_id)
);

CREATE INDEX idx_news_bookmarks_user_saved ON news_bookmarks(user_id, saved_at DESC);

CREATE TABLE news_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_id INTEGER NOT NULL REFERENCES news(id),
  url TEXT NOT NULL,                                  -- '/api/media/news/...' or external URL
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_news_images_news_sort ON news_images(news_id, sort_order);

CREATE TABLE event_registrations (
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER NOT NULL REFERENCES events(id),
  registered_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX idx_event_regs_user_time ON event_registrations(user_id, registered_at DESC);

CREATE TABLE event_bookmarks (
  user_id INTEGER NOT NULL REFERENCES users(id),
  event_id INTEGER NOT NULL REFERENCES events(id),
  saved_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX idx_event_bookmarks_user_saved ON event_bookmarks(user_id, saved_at DESC);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),     -- the conversation owner (always a regular user)
  author_id INTEGER NOT NULL REFERENCES users(id),   -- who wrote this message
  author_role TEXT NOT NULL,                          -- 'member' | 'admin'
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  read_at INTEGER                                     -- when the other side first opened the thread after this message
);

CREATE INDEX idx_chat_user_created ON chat_messages(user_id, created_at);
CREATE INDEX idx_chat_unread ON chat_messages(user_id, read_at);

CREATE TABLE membership_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),         -- nullable: anon orders allowed in dev
  plan_id TEXT NOT NULL,                         -- '6m' | '1y'
  months INTEGER NOT NULL,
  amount INTEGER NOT NULL,                       -- tugriks (₮)
  reference TEXT UNIQUE NOT NULL,                -- e.g., 'MWA-A1B2C3' (internal id)
  customer_memo TEXT,                            -- what the user puts in bank transfer memo (their name)
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'pending',        -- pending | confirmed | rejected
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  confirmed_at INTEGER,                          -- when admin verified deposit
  starts_at INTEGER,                             -- access window start (set on confirm)
  ends_at INTEGER,                               -- access window end
  admin_note TEXT
);

CREATE INDEX idx_membership_payments_user ON membership_payments(user_id);
CREATE INDEX idx_membership_payments_status ON membership_payments(status);
