-- AquaMeet tenant database schema.
-- Apply with: wrangler d1 execute aquameet --remote --file=apps/api/migrations/0001_init.sql
-- Mirrors SCHEMA_SQL in packages/persistence/src/schema.ts.

CREATE TABLE IF NOT EXISTS competitions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clubs (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS divers (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_category ON entries (category_id);
CREATE TABLE IF NOT EXISTS sheets (entry_id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
