-- Add delete_request column to users table
ALTER TABLE users ADD COLUMN delete_request BOOLEAN DEFAULT FALSE NOT NULL;
