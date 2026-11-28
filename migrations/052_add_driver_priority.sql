ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS driver_priority INTEGER;

ALTER TABLE service_requests
DROP CONSTRAINT IF EXISTS service_requests_driver_priority_positive;

ALTER TABLE service_requests
ADD CONSTRAINT service_requests_driver_priority_positive
CHECK (driver_priority IS NULL OR driver_priority > 0);

CREATE INDEX IF NOT EXISTS idx_service_requests_driver_priority
ON service_requests(driver_id, driver_priority)
WHERE driver_id IS NOT NULL AND status NOT IN ('cancelled', 'completed');
