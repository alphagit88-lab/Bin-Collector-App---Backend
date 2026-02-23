-- Migration 025: Link payouts to wallet_transactions (jobs) for invoice line items and paid-out tracking
-- Payout request is now based on selected pending job credits; invoice shows those jobs; approved payout marks them paid.

CREATE TABLE IF NOT EXISTS payout_items (
    id SERIAL PRIMARY KEY,
    payout_id INTEGER NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
    wallet_transaction_id INTEGER NOT NULL REFERENCES wallet_transactions(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id ON payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_wallet_transaction_id ON payout_items(wallet_transaction_id);

COMMENT ON TABLE payout_items IS 'Links each payout to the wallet_transactions (job credits) included in it. Invoice line items are derived from this.';
