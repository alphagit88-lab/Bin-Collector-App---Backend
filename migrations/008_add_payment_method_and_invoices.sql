-- Add payment_method to service_requests (without constraint first)
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'online';

-- Drop the status constraint temporarily to allow status updates
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_status_check;

-- Map existing statuses to new status flow
-- in_progress -> on_delivery (bin loaded and on the way)
UPDATE service_requests SET status = 'on_delivery' WHERE status = 'in_progress';
-- loaded -> on_delivery (same meaning in new flow)
UPDATE service_requests SET status = 'on_delivery' WHERE status = 'loaded';
-- picked_up -> pickup (new status name)
UPDATE service_requests SET status = 'pickup' WHERE status = 'picked_up';

-- Add payment_method constraint (drop first if exists)
ALTER TABLE service_requests 
DROP CONSTRAINT IF EXISTS service_requests_payment_method_check;

ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_payment_method_check 
CHECK (payment_method IN ('cash', 'online'));

-- Add new status constraint
ALTER TABLE service_requests 
ADD CONSTRAINT service_requests_status_check 
CHECK (status IN (
  'pending', 
  'quoted', 
  'accepted', 
  'confirmed', 
  'on_delivery',
  'delivered',
  'ready_to_pickup',
  'pickup',
  'completed', 
  'cancelled'
));

-- Create invoices table (quote_id will be removed in migration 010)
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL UNIQUE,
    service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'online')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'refunded')),
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_service_request_id ON invoices(service_request_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_id ON invoices(invoice_id);
