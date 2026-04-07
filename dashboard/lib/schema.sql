-- Schema SQL — Social Acquisition Dashboard
-- All tables use CREATE TABLE IF NOT EXISTS for idempotent execution

-- Posts (from posts.yaml + posts-drafts.yaml)
CREATE TABLE IF NOT EXISTS posts (
  id                   TEXT PRIMARY KEY,
  status               TEXT NOT NULL,
  platform             TEXT NOT NULL,
  type                 TEXT,
  hook                 TEXT,
  cta_type             TEXT,
  objection_addressed  TEXT,
  created_date         DATE,
  published_date       DATE,
  tags                 JSONB DEFAULT '[]',
  metrics              JSONB DEFAULT '{}',
  is_draft             BOOLEAN DEFAULT false,
  content              TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Comments (from comments.yaml)
CREATE TABLE IF NOT EXISTS comments (
  id                TEXT PRIMARY KEY,
  post_id           TEXT REFERENCES posts(id),
  date              DATE,
  platform          TEXT,
  author_name       TEXT,
  full_name         TEXT,
  classification    TEXT,
  objection_type    TEXT,
  comment_text      TEXT,
  response_text     TEXT,
  response_status   TEXT DEFAULT 'pending',
  converted_to_dm   BOOLEAN DEFAULT false,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Prospects / DM Pipeline (from dm-pipeline.yaml)
CREATE TABLE IF NOT EXISTS prospects (
  id                   TEXT PRIMARY KEY,
  source_comment_id    TEXT,
  source_post_id       TEXT REFERENCES posts(id),
  platform             TEXT,
  prospect_name        TEXT,
  full_name            TEXT,
  date_first_contact   DATE,
  stage                TEXT DEFAULT 'new',
  messages             JSONB DEFAULT '[]',
  calendly_date        DATE,
  conversion_date      DATE,
  lost_reason          TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Metrics (from metrics-weekly.yaml)
CREATE TABLE IF NOT EXISTS metrics_weekly (
  week                TEXT PRIMARY KEY,
  dates               TEXT,
  posts_published     INT DEFAULT 0,
  total_reach         INT DEFAULT 0,
  total_impressions   INT DEFAULT 0,
  total_likes         INT DEFAULT 0,
  total_comments      INT DEFAULT 0,
  total_shares        INT DEFAULT 0,
  info_comments       INT DEFAULT 0,
  dm_opened           INT DEFAULT 0,
  calendly_booked     INT DEFAULT 0,
  patients_converted  INT DEFAULT 0,
  engagement_rate     NUMERIC(5,2) DEFAULT 0,
  best_post_id        TEXT,
  worst_post_id       TEXT,
  top_objection       TEXT,
  learnings           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Session table for connect-pg-simple (INFRA-04)
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid"    varchar NOT NULL COLLATE "default" PRIMARY KEY,
  "sess"   json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);

CREATE INDEX IF NOT EXISTS "IDX_session_expire"
  ON "user_sessions" ("expire");
