CREATE TABLE IF NOT EXISTS service_areas (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    area_radius_km INTEGER NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_areas_supplier ON service_areas(supplier_id);
