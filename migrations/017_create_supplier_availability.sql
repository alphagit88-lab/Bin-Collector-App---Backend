CREATE TABLE IF NOT EXISTS supplier_availabilities (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    start_time VARCHAR(20),
    end_time VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supplier_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_supplier_avail_supplier ON supplier_availabilities(supplier_id);
