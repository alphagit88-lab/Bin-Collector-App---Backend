CREATE TABLE IF NOT EXISTS password_reset_otps (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  otp_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  send_count INTEGER NOT NULL DEFAULT 1,
  verify_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires_at
  ON password_reset_otps (expires_at);
