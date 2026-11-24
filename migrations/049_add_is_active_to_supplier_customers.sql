-- Migration 049: Add is_active column to supplier_customers pivot table
-- Allows suppliers to activate/deactivate customers without removing their assignment or account

ALTER TABLE supplier_customers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Ensure existing records have is_active set to true
UPDATE supplier_customers
SET is_active = TRUE
WHERE is_active IS NULL;

-- Index for filtering active customers
CREATE INDEX IF NOT EXISTS idx_supplier_customers_is_active
ON supplier_customers(supplier_id, is_active);
