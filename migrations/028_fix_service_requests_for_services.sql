-- Migration 028: Fix service_requests table for general service bookings
-- 1. Update service_category check constraint to include 'service'
-- 2. Make bin_type_id nullable (already done for bin_size_id in migration 020)

-- First, drop the existing check constraint on service_category
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_service_category_check;

-- Add the new check constraint including 'service'
ALTER TABLE service_requests ADD CONSTRAINT service_requests_service_category_check 
CHECK (service_category IN ('commercial', 'residential', 'service'));

-- Make bin_type_id nullable
ALTER TABLE service_requests ALTER COLUMN bin_type_id DROP NOT NULL;
