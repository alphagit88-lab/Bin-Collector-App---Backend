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

-- Add project_id to service_requests
ALTER TABLE service_requests
ADD COLUMN project_id INT NULL,
ADD CONSTRAINT fk_service_request_project
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
