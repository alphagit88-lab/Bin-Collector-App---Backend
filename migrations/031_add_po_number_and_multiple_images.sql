-- Add PO Number and multiple images support to service_requests
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT '[]';

-- Create Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES service_requests(id),
    user_id INTEGER REFERENCES users(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'paid', -- paid, pending, void
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add billing visibility flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_billing BOOLEAN DEFAULT FALSE;
