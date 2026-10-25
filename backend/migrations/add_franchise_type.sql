ALTER TABLE franchise_applications
  ADD COLUMN IF NOT EXISTS franchise_type TEXT NOT NULL DEFAULT '';
