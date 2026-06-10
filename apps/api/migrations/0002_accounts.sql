-- AquaMeet — club accounts & organisations (plan v2 §4).
-- Apply with: wrangler d1 execute aquameet --remote --file=apps/api/migrations/0002_accounts.sql

CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, data TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  organization_id TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts (organization_id);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_account ON auth_tokens (account_id);
