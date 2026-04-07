-- AI Generation tracking table (Phase 4)
CREATE TABLE IF NOT EXISTS ai_generations (
  id SERIAL PRIMARY KEY,
  month_key VARCHAR(7) NOT NULL,
  post_type VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  generated_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_gen_month ON ai_generations(month_key);
