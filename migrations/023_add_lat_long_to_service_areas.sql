-- Add latitude and longitude to service_areas table safely
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_areas' AND column_name='latitude') THEN
        ALTER TABLE service_areas ADD COLUMN latitude DECIMAL(10, 8);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_areas' AND column_name='longitude') THEN
        ALTER TABLE service_areas ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;
