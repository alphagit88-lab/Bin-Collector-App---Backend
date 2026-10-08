ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_role
ON users(role)
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_users_active_supplier
ON users(supplier_id)
WHERE is_deleted = FALSE AND supplier_id IS NOT NULL;

-- Allow a phone number from a deleted account to be registered again while
-- keeping the old row intact for historical orders.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
DROP INDEX IF EXISTS idx_users_phone;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_active_phone
ON users(phone)
WHERE is_deleted = FALSE;
