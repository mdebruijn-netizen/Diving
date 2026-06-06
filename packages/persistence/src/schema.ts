/**
 * D1 schema for a tenant database. Entities are stored document-style — a JSON
 * `data` column plus the columns needed for the queries we actually run (e.g.
 * `category_id` for entries). One D1 database per tenant (plan ADR 0001).
 */
export const SCHEMA_SQL = `
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
`.trim();
