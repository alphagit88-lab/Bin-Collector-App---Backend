-- Migration 050: Add invitation token and accepted_at to supplier_customers
ALTER TABLE supplier_customers
ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;

-- Default for future links should be inactive until accepted
ALTER TABLE supplier_customers
ALTER COLUMN is_active SET DEFAULT FALSE;

-- Existing records should be marked as accepted so suppliers can continue managing them
UPDATE supplier_customers
SET accepted_at = COALESCE(created_at, NOW())
WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_customers_token ON supplier_customers(invitation_token);
CREATE INDEX IF NOT EXISTS idx_supplier_customers_accepted ON supplier_customers(supplier_id, accepted_at);
