-- Remove quote functionality
-- Drop quotes table and related indexes
DROP INDEX IF EXISTS idx_quotes_service_request_id;
DROP INDEX IF EXISTS idx_quotes_supplier_id;
DROP INDEX IF EXISTS idx_quotes_status;
DROP TABLE IF EXISTS quotes CASCADE;

-- Remove quote_id from invoices table
ALTER TABLE invoices 
DROP COLUMN IF EXISTS quote_id;

-- Update service_requests status constraint to remove quoted and accepted
-- First, map existing quoted/accepted statuses to confirmed
UPDATE service_requests SET status = 'confirmed' WHERE status IN ('quoted', 'accepted');

-- Drop and recreate status constraint
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_status_check 
CHECK (status IN (
  'pending', 
  'confirmed', 
  'on_delivery',
  'delivered',
  'ready_to_pickup',
  'pickup',
  'completed', 
  'cancelled'
));
