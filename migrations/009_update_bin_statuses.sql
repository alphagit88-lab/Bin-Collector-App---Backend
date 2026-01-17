-- Map existing bin statuses to new flow before updating constraint
-- confirmed -> loaded (if assigned to a request) or available (if not assigned)
UPDATE physical_bins 
SET status = CASE 
  WHEN current_service_request_id IS NOT NULL THEN 'loaded'
  ELSE 'available'
END
WHERE status = 'confirmed';

-- Update physical_bins status constraint to match new flow
ALTER TABLE physical_bins 
DROP CONSTRAINT IF EXISTS physical_bins_status_check;

ALTER TABLE physical_bins 
ADD CONSTRAINT physical_bins_status_check 
CHECK (status IN (
  'available',
  'loaded',
  'delivered',
  'ready_to_pickup',
  'picked_up',
  'unavailable'
));
