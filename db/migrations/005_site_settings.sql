-- Additive migration: site_settings key/value store for admin-editable
-- runtime configuration (bank account info, etc.).

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
