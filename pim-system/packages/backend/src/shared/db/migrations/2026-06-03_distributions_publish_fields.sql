-- 2026-06-03: distributions 新增发布相关字段
ALTER TABLE distributions
  ADD COLUMN IF NOT EXISTS r2_path TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
