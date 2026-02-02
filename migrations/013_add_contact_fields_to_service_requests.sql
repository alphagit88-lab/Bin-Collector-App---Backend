-- Migration 013: Add contact details and instructions to service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS instructions TEXT;
