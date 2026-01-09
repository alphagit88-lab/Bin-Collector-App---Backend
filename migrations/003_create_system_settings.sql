-- Create system_settings table for configurable parameters
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    category VARCHAR(50) DEFAULT 'general', -- general, pricing, commission, notifications
    is_public BOOLEAN DEFAULT false, -- whether this setting can be accessed without auth
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default system settings
INSERT INTO system_settings (key, value, type, description, category) VALUES
    ('platform_commission_percentage', '15', 'number', 'Platform commission percentage for suppliers', 'commission'),
    ('min_booking_duration_days', '1', 'number', 'Minimum booking duration in days', 'general'),
    ('max_booking_duration_days', '365', 'number', 'Maximum booking duration in days', 'general'),
    ('quote_expiry_hours', '24', 'number', 'Hours until a quote expires', 'general'),
    ('base_price_algorithm', '{"base_multiplier": 1.0, "location_factor": 0.1, "duration_factor": 0.05}', 'json', 'Base pricing algorithm parameters', 'pricing'),
    ('enable_notifications', 'true', 'boolean', 'Enable push notifications', 'notifications'),
    ('support_email', 'support@binrental.com', 'string', 'Support email address', 'general'),
    ('support_phone', '+1234567890', 'string', 'Support phone number', 'general')
ON CONFLICT (key) DO NOTHING;
