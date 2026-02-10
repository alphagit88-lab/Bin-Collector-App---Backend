-- Migration 020: Make bin_size_id optional in physical_bins, service_requests, and order_items
-- This allows bin types that don't have associated sizes

-- Update physical_bins
ALTER TABLE physical_bins ALTER COLUMN bin_size_id DROP NOT NULL;

-- Update service_requests
ALTER TABLE service_requests ALTER COLUMN bin_size_id DROP NOT NULL;

-- Update order_items
ALTER TABLE order_items ALTER COLUMN bin_size_id DROP NOT NULL;
