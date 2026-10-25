-- December Delights — product gallery (up to 4 images: 1 main + 3 extra)
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (IF NOT EXISTS / guarded update).

ALTER TABLE products ADD COLUMN IF NOT EXISTS extra_images TEXT NOT NULL DEFAULT '[]';
