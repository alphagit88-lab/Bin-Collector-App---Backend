-- Add location, latitude, and longitude to projects table safely
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='location') THEN
        ALTER TABLE projects ADD COLUMN location TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='latitude') THEN
        ALTER TABLE projects ADD COLUMN latitude DECIMAL(10, 8);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='longitude') THEN
        ALTER TABLE projects ADD COLUMN longitude DECIMAL(11, 8);
    END IF;
END $$;
