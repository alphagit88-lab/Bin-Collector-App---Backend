-- Create bin_types table
CREATE TABLE IF NOT EXISTS bin_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bin_sizes table
CREATE TABLE IF NOT EXISTS bin_sizes (
    id SERIAL PRIMARY KEY,
    bin_type_id INTEGER NOT NULL REFERENCES bin_types(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL, -- e.g., "3m³", "6m³", "10m³"
    capacity_cubic_meters DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bin_type_id, size)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bin_types_active ON bin_types(is_active);
CREATE INDEX IF NOT EXISTS idx_bin_sizes_type_id ON bin_sizes(bin_type_id);
CREATE INDEX IF NOT EXISTS idx_bin_sizes_active ON bin_sizes(is_active);

-- Insert default bin types
INSERT INTO bin_types (name, description, display_order) VALUES
    ('General Waste', 'General household and commercial waste', 1),
    ('Green Waste', 'Garden and organic waste', 2),
    ('Builders Waste', 'Construction and building materials', 3),
    ('Concrete/Dirt', 'Concrete, dirt, and heavy materials', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default bin sizes for each type
INSERT INTO bin_sizes (bin_type_id, size, capacity_cubic_meters, display_order)
SELECT 
    bt.id,
    size_data.size,
    size_data.capacity,
    size_data.order
FROM bin_types bt
CROSS JOIN (
    VALUES 
        ('3m³', 3.0, 1),
        ('6m³', 6.0, 2),
        ('10m³', 10.0, 3)
) AS size_data(size, capacity, "order")
WHERE bt.name IN ('General Waste', 'Green Waste', 'Builders Waste', 'Concrete/Dirt')
ON CONFLICT (bin_type_id, size) DO NOTHING;
