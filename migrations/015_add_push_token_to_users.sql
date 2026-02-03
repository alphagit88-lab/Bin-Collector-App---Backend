-- Migration to add push_token to users table for notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token);
