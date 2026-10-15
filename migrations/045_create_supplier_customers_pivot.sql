-- Migration 045: Create supplier_customers pivot table for many-to-many relationship
-- This replaces the single supplier_id column approach for customers

-- 1. Create the pivot table
CREATE TABLE IF NOT EXISTS supplier_customers (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (supplier_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_customers_supplier ON supplier_customers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_customers_customer ON supplier_customers(customer_id);

-- 2. Migrate existing customer-supplier links from users.supplier_id into the pivot table
INSERT INTO supplier_customers (supplier_id, customer_id, created_at)
SELECT u.supplier_id, u.id, NOW()
FROM users u
WHERE u.role = 'customer'
  AND u.supplier_id IS NOT NULL
ON CONFLICT (supplier_id, customer_id) DO NOTHING;

-- 3. Clear supplier_id on customers (keep it only for drivers)
UPDATE users
SET supplier_id = NULL
WHERE role = 'customer' AND supplier_id IS NOT NULL;
