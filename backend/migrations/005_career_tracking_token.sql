-- Adds per-applicant tracking code to career_applications.
-- Used by GET /api/careers/track, which now requires the tracking code
-- (issued at submit time) instead of exposing applications by bare
-- phone-number / name-fragment lookup.

ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS tracking_code TEXT NOT NULL DEFAULT '';
