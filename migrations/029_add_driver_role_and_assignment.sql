-- Migration 029: Add Driver Role and Assignment
-- Update role check constraint to include 'driver'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'customer', 'supplier', 'driver'));

-- Add supplier_id to users to link drivers to suppliers
ALTER TABLE users ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES users(id);

-- Add driver_id to service_requests to track assigned driver
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES users(id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_supplier_id ON users(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_requests_driver_id ON service_requests(driver_id) WHERE driver_id IS NOT NULL;
