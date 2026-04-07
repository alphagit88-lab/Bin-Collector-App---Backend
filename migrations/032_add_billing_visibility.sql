-- Migration: Add billing visibility to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_billing BOOLEAN DEFAULT FALSE;
