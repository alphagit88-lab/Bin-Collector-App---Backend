-- Migration 024: Add 'cash_collected' status to service_requests and order_items
-- This status is used for cash orders before they are marked as delivered.

-- 1. Update service_requests status check constraint
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_status_check 
CHECK (status IN (
  'pending', 
  'confirmed', 
  'on_delivery',
  'cash_collected',
  'delivered',
  'ready_to_pickup',
  'picked_up',
  'pickup',
  'completed', 
  'cancelled'
));

-- 2. Update order_items status check constraint
ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_items_status_check;

ALTER TABLE order_items
ADD CONSTRAINT order_items_status_check 
CHECK (status IN (
  'pending', 
  'assigned', 
  'loaded', 
  'cash_collected',
  'delivered', 
  'ready_to_pickup', 
  'picked_up', 
  'completed'
));
