-- Change invoices table to link with payouts instead of service requests
-- 1. Make service_request_id nullable (for backward compatibility if needed, or to transition)
ALTER TABLE invoices ALTER COLUMN service_request_id DROP NOT NULL;

-- 2. Add payout_id column
ALTER TABLE invoices ADD COLUMN payout_id INTEGER REFERENCES payouts(id) ON DELETE CASCADE;

-- 3. Make customer_id nullable (as system is the payer for payouts)
ALTER TABLE invoices ALTER COLUMN customer_id DROP NOT NULL;

-- 4. Update payment_method constraint to include 'payout' or keep it flexible
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_method_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_payment_method_check CHECK (payment_method IN ('cash', 'online', 'bank_transfer', 'payout'));

-- 5. Add index for payout_id
CREATE INDEX IF NOT EXISTS idx_invoices_payout_id ON invoices(payout_id);
