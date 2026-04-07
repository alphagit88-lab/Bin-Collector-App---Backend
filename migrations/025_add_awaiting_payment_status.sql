-- Migration 025: Allow awaiting_payment status in service_requests
-- Online bookings move to awaiting_payment after supplier acceptance.

ALTER TABLE service_requests
DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE service_requests
ADD CONSTRAINT service_requests_status_check
CHECK (status IN (
  'pending',
  'awaiting_payment',
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
