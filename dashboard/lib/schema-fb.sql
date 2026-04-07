-- Facebook integration schema — extends schema.sql
-- All tables use CREATE TABLE IF NOT EXISTS for idempotent execution

-- Facebook token storage
CREATE TABLE IF NOT EXISTS fb_tokens (
  id SERIAL PRIMARY KEY,
  token_type VARCHAR(20) NOT NULL DEFAULT 'page_access',
  access_token TEXT NOT NULL,
  page_id VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ,
  scopes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync state / feature flags (key-value store)
CREATE TABLE IF NOT EXISTS fb_sync_state (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-level Facebook metrics (synced daily)
CREATE TABLE IF NOT EXISTS post_metrics (
  id SERIAL PRIMARY KEY,
  post_id TEXT REFERENCES posts(id),
  fb_post_id VARCHAR(100),
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, metric_date)
);
