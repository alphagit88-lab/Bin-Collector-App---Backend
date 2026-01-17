-- Update service_requests table to include new statuses for bin tracking
-- This migration adds: loaded, delivered, ready_to_pickup, picked_up, on_delivery, pickup

-- Drop the existing CHECK constraint
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Add new CHECK constraint with all statuses (including old ones for compatibility)
-- Note: quoted/accepted will be removed in migration 010
-- This constraint includes all possible statuses from both old and new flows
ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_status_check 
CHECK (status IN (
  'pending', 
  'quoted', 
  'accepted', 
  'confirmed', 
  'in_progress',
  'on_delivery',
  'loaded',
  'delivered',
  'ready_to_pickup',
  'picked_up',
  'pickup',
  'completed', 
  'cancelled'
));
