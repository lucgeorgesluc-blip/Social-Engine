-- Phase 3: Add scheduled_date for post scheduling (POST-05)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_date DATE;
