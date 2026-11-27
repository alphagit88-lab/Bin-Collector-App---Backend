-- Migration 051: Add supplier select price range setting and candidate offers table

-- 1. Insert default setting for supplier select price range ($10 default)
INSERT INTO system_settings (key, value, type, description, category, is_public)
VALUES ('supplier_select_price_range', '10', 'number', 'Price range window for selecting candidate suppliers ($)', 'pricing', true)
ON CONFLICT (key) DO NOTHING;

-- 2. Create order_supplier_offers table to track candidate suppliers offered a pending request
CREATE TABLE IF NOT EXISTS order_supplier_offers (
    id SERIAL PRIMARY KEY,
    service_request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offered_price DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'offered', -- 'offered', 'accepted', 'claimed_by_other', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_order_supplier UNIQUE (service_request_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_order_supplier_offers_req ON order_supplier_offers(service_request_id);
CREATE INDEX IF NOT EXISTS idx_order_supplier_offers_sup ON order_supplier_offers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_supplier_offers_status ON order_supplier_offers(status);
