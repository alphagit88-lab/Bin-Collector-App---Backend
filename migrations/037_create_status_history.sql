-- Create status_history table
CREATE TABLE IF NOT EXISTS status_history (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups by service_request_id
CREATE INDEX IF NOT EXISTS idx_status_history_request_id ON status_history(service_request_id);

-- Backfill initial statuses for existing requests
INSERT INTO status_history (service_request_id, status, changed_at)
SELECT id, 'pending', created_at
FROM service_requests
WHERE NOT EXISTS (
    SELECT 1 FROM status_history sh 
    WHERE sh.service_request_id = service_requests.id 
    AND sh.status = 'pending'
);

-- Backfill current status if it's not pending
INSERT INTO status_history (service_request_id, status, changed_at)
SELECT id, status, updated_at
FROM service_requests
WHERE status != 'pending'
AND NOT EXISTS (
    SELECT 1 FROM status_history sh 
    WHERE sh.service_request_id = service_requests.id 
    AND sh.status = service_requests.status
);
