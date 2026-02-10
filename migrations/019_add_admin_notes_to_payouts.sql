-- Add admin_notes to payouts table and update status constraint
DO $$ 
BEGIN
    -- 1. Add admin_notes if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payouts' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE payouts ADD COLUMN admin_notes TEXT;
    END IF;

    -- 2. Update status constraint to include approved and rejected
    ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
    ALTER TABLE payouts ADD CONSTRAINT payouts_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'approved', 'rejected'));
END $$;
