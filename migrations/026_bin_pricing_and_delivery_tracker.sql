-- 1. Create service_area_bins table if not exists or add columns
CREATE TABLE IF NOT EXISTS service_area_bins (
    id SERIAL PRIMARY KEY,
    service_area_id INTEGER NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
    bin_size_id INTEGER REFERENCES bin_sizes(id) ON DELETE CASCADE,
    bin_type_id INTEGER REFERENCES bin_types(id) ON DELETE CASCADE,
    supplier_price DECIMAL(10, 2) NOT NULL,
    admin_final_price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_area_id, bin_size_id)
);

-- Ensure bin_size_id is nullable (it was NOT NULL initially in some versions)
ALTER TABLE service_area_bins ALTER COLUMN bin_size_id DROP NOT NULL;

-- Add bin_type_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_area_bins' AND column_name = 'bin_type_id') THEN
        ALTER TABLE service_area_bins ADD COLUMN bin_type_id INTEGER REFERENCES bin_types(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Unique constraint for size-less types (one price per type per area)
DROP INDEX IF EXISTS idx_service_area_bins_type_only;
CREATE UNIQUE INDEX idx_service_area_bins_type_only 
ON service_area_bins(service_area_id, bin_type_id) 
WHERE bin_size_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_area_bins_service_area_id ON service_area_bins(service_area_id);
CREATE INDEX IF NOT EXISTS idx_service_area_bins_bin_size_id ON service_area_bins(bin_size_id);
CREATE INDEX IF NOT EXISTS idx_service_area_bins_active ON service_area_bins(is_active);

-- 2. Add delivery_photo_url to service_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_requests' 
        AND column_name = 'delivery_photo_url'
    ) THEN
        ALTER TABLE service_requests ADD COLUMN delivery_photo_url TEXT;
    END IF;
END $$;

COMMENT ON TABLE service_area_bins IS 'Links bins to service areas and manages pricing. supplier_price is the suggestion, admin_final_price is the actual price charged.';
COMMENT ON COLUMN service_requests.delivery_photo_url IS 'URL of the photo uploaded by supplier as proof of delivery.';
