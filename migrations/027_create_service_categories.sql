-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add selected_services field to service_requests
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS selected_services JSONB;

-- Insert some initial service categories
INSERT INTO service_categories (name, description) VALUES
    ('Skip Bin Delivery', 'Delivery of various skip bin sizes'),
    ('Garden Waste Removal', 'Professional cleaning and removal of garden waste'),
    ('Pool Bin Services', 'Specialized bins for pool areas'),
    ('General Service', 'Other general maintenance services')
ON CONFLICT (name) DO NOTHING;
