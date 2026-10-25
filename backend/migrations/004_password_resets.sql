-- =============================================================================
-- December Delights — Admin password reset (superadmin OTP flow)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id     BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  otp_hash          TEXT NOT NULL,
  reset_token_hash  TEXT NOT NULL DEFAULT '',
  expires_at        TIMESTAMPTZ NOT NULL,
  attempts          INTEGER NOT NULL DEFAULT 0,
  verified          BOOLEAN NOT NULL DEFAULT false,
  used              BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwd_resets_user ON admin_password_resets(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_expires ON admin_password_resets(expires_at);
