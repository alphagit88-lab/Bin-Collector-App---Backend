-- Update service_requests table to include new statuses for bin tracking
-- This migration adds: loaded, delivered, ready_to_pickup, picked_up

-- Drop the existing CHECK constraint
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Add new CHECK constraint with all statuses
ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_status_check 
CHECK (status IN (
  'pending', 
  'quoted', 
  'accepted', 
  'confirmed', 
  'in_progress',
  'loaded',
  'delivered',
  'ready_to_pickup',
  'picked_up',
  'completed', 
  'cancelled'
));
