-- Change invoices table to link with payouts instead of service requests
-- Use a DO block to make the migration idempotent

DO $$ 
BEGIN
    -- 1. Make service_request_id nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'service_request_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE invoices ALTER COLUMN service_request_id DROP NOT NULL;
    END IF;

    -- 2. Add payout_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'payout_id'
    ) THEN
        ALTER TABLE invoices ADD COLUMN payout_id INTEGER REFERENCES payouts(id) ON DELETE CASCADE;
    END IF;

    -- 3. Make customer_id nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'customer_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE invoices ALTER COLUMN customer_id DROP NOT NULL;
    END IF;

    -- 4. Update payment_method constraint
    ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_method_check;
    ALTER TABLE invoices ADD CONSTRAINT invoices_payment_method_check CHECK (payment_method IN ('cash', 'online', 'bank_transfer', 'payout'));

END $$;

-- 5. Add index for payout_id
CREATE INDEX IF NOT EXISTS idx_invoices_payout_id ON invoices(payout_id);
