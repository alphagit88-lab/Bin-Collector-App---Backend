-- Make start_date and end_date nullable for commercial bookings
ALTER TABLE service_requests ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE service_requests ALTER COLUMN end_date DROP NOT NULL;

-- Update payment_method for commercial bookings
-- Remove default value
ALTER TABLE service_requests ALTER COLUMN payment_method DROP DEFAULT;
-- Update check constraint to allow null
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_payment_method_check;
ALTER TABLE service_requests ADD CONSTRAINT service_requests_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'online'));

-- Make duration and pricing columns nullable
ALTER TABLE service_requests ALTER COLUMN base_price DROP NOT NULL;
ALTER TABLE service_requests ALTER COLUMN additional_duration_charge DROP NOT NULL;
ALTER TABLE service_requests ALTER COLUMN duration_days DROP NOT NULL;
ALTER TABLE service_requests ALTER COLUMN exceeded_days DROP NOT NULL;
