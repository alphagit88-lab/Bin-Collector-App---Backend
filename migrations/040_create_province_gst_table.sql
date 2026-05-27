-- Create province_gst table for Canadian province-wise GST rates
CREATE TABLE IF NOT EXISTS province_gst (
    id SERIAL PRIMARY KEY,
    province_code VARCHAR(2) NOT NULL UNIQUE,
    province_name VARCHAR(100) NOT NULL,
    gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_province_gst_code ON province_gst(province_code);

-- Insert default Canadian provinces and territories with initial GST rates (5% is the default GST)
INSERT INTO province_gst (province_code, province_name, gst_rate) VALUES
    ('AB', 'Alberta', 5.00),
    ('BC', 'British Columbia', 5.00),
    ('MB', 'Manitoba', 5.00),
    ('NB', 'New Brunswick', 5.00),
    ('NL', 'Newfoundland and Labrador', 5.00),
    ('NS', 'Nova Scotia', 5.00),
    ('ON', 'Ontario', 5.00),
    ('PE', 'Prince Edward Island', 5.00),
    ('QC', 'Quebec', 5.00),
    ('SK', 'Saskatchewan', 5.00),
    ('NT', 'Northwest Territories', 5.00),
    ('NU', 'Nunavut', 5.00),
    ('YT', 'Yukon', 5.00)
ON CONFLICT (province_code) DO NOTHING;

-- Add default_gst_rate to system_settings
INSERT INTO system_settings (key, value, type, description, category, is_public) VALUES
    ('default_gst_rate', '5.00', 'number', 'Default GST rate percentage', 'pricing', true)
ON CONFLICT (key) DO NOTHING;
