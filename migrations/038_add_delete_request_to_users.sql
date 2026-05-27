-- Add delete_request column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_request BOOLEAN DEFAULT FALSE NOT NULL;
