-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add project_id to service_requests safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_requests' AND column_name='project_id') THEN
        ALTER TABLE service_requests ADD COLUMN project_id INT NULL;
    END IF;
END $$;

-- Ensure constraint is added (drop first to be safe)
ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS fk_service_request_project;
ALTER TABLE service_requests
ADD CONSTRAINT fk_service_request_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
