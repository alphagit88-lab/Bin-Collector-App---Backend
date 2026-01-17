-- Create physical_bins table (actual bin units)
CREATE TABLE IF NOT EXISTS physical_bins (
    id SERIAL PRIMARY KEY,
    bin_code VARCHAR(20) NOT NULL UNIQUE,
    bin_type_id INTEGER NOT NULL REFERENCES bin_types(id) ON DELETE RESTRICT,
    bin_size_id INTEGER NOT NULL REFERENCES bin_sizes(id) ON DELETE RESTRICT,
    supplier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'confirmed', 'loaded', 'delivered', 'ready_to_pickup', 'picked_up', 'unavailable')),
    current_customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    current_service_request_id INTEGER REFERENCES service_requests(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_physical_bins_bin_code ON physical_bins(bin_code);
CREATE INDEX IF NOT EXISTS idx_physical_bins_supplier_id ON physical_bins(supplier_id);
CREATE INDEX IF NOT EXISTS idx_physical_bins_status ON physical_bins(status);
CREATE INDEX IF NOT EXISTS idx_physical_bins_customer_id ON physical_bins(current_customer_id);
CREATE INDEX IF NOT EXISTS idx_physical_bins_service_request_id ON physical_bins(current_service_request_id);

-- Add bin_id column to service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS bin_id INTEGER REFERENCES physical_bins(id) ON DELETE SET NULL;

-- Create index for bin_id in service_requests
CREATE INDEX IF NOT EXISTS idx_service_requests_bin_id ON service_requests(bin_id);

-- Update service_requests status to include new statuses
-- First drop the constraint
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Note: Status constraint will be updated in migration 007 and 008
-- This migration just creates the physical_bins table
