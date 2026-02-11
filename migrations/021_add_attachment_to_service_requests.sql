-- Add attachment_url to service_requests table
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS attachment_url TEXT;
