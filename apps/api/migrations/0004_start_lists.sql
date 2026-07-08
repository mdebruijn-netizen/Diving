-- AquaMeet — start lists / running order (plan v2 §5, Phase 3).
-- Apply with: wrangler d1 execute aquameet --remote --file=apps/api/migrations/0004_start_lists.sql

CREATE TABLE IF NOT EXISTS start_lists (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_start_lists_category ON start_lists (category_id);
