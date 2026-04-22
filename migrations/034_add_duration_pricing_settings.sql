-- Migration 034: Add duration-based pricing settings and order fields
-- Insert duration settings
INSERT INTO system_settings (key, value, type, description, category, is_public) VALUES
    ('commercial_duration_limit', '30', 'number', 'Maximum days for commercial orders before additional charges apply', 'pricing', true),
    ('residential_duration_limit', '4', 'number', 'Maximum days for residential orders before additional charges apply', 'pricing', true),
    ('additional_day_charge', '10', 'number', 'Daily charge for each day exceeding the duration limit', 'pricing', true)
ON CONFLICT (key) DO NOTHING;

-- Add pricing breakdown fields to service_requests
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS additional_duration_charge DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS exceeded_days INTEGER DEFAULT 0;
