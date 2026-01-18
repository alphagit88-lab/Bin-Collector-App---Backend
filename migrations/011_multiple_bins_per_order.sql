-- Migration 011: Support multiple bins per order and add invoice_id to service_requests

-- Create order_items table to support multiple bins per order
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    bin_type_id INTEGER NOT NULL REFERENCES bin_types(id) ON DELETE RESTRICT,
    bin_size_id INTEGER NOT NULL REFERENCES bin_sizes(id) ON DELETE RESTRICT,
    physical_bin_id INTEGER REFERENCES physical_bins(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'loaded', 'delivered', 'ready_to_pickup', 'picked_up', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_service_request_id ON order_items(service_request_id);
CREATE INDEX IF NOT EXISTS idx_order_items_bin_type_id ON order_items(bin_type_id);
CREATE INDEX IF NOT EXISTS idx_order_items_bin_size_id ON order_items(bin_size_id);
CREATE INDEX IF NOT EXISTS idx_order_items_physical_bin_id ON order_items(physical_bin_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- Add invoice_id to service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(50);

-- Create index for invoice_id
CREATE INDEX IF NOT EXISTS idx_service_requests_invoice_id ON service_requests(invoice_id);

-- Add foreign key constraint to invoices table (if invoice_id exists in invoices)
-- Note: This assumes invoice_id in invoices table matches the invoice_id column we're adding
-- We'll add a comment since we can't directly reference invoice_id from invoices table

COMMENT ON COLUMN service_requests.invoice_id IS 'References invoices.invoice_id';
