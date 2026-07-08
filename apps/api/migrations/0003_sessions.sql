-- AquaMeet — competition sessions (plan v2 §5, Phase 2: schedule structure).
-- Apply with: wrangler d1 execute aquameet --remote --file=apps/api/migrations/0003_sessions.sql

CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL);
