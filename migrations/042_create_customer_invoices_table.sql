-- Create customer_invoices table
CREATE TABLE IF NOT EXISTS customer_invoices (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    service_category VARCHAR(50) NOT NULL, -- 'commercial' or 'residential'
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    payment_method VARCHAR(50),
    paid_at TIMESTAMP,
    pdf_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, service_category, month, year)
);

-- Create index for faster queries
CREATE INDEX idx_customer_invoices_customer_id ON customer_invoices(customer_id);
CREATE INDEX idx_customer_invoices_month_year ON customer_invoices(month, year);
CREATE INDEX idx_customer_invoices_service_category ON customer_invoices(service_category);
