-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    supplier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    booking_id VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0,
    net_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'stripe',
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'commission')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Insert 5 sample transactions (only if customers and suppliers exist)
DO $$
DECLARE
    customer_ids INTEGER[];
    supplier_ids INTEGER[];
    customer_id INTEGER;
    supplier_id INTEGER;
    i INTEGER;
BEGIN
    -- Get customer IDs
    SELECT ARRAY_AGG(id) INTO customer_ids FROM users WHERE role = 'customer';
    -- Get supplier IDs
    SELECT ARRAY_AGG(id) INTO supplier_ids FROM users WHERE role = 'supplier';
    
    -- Only insert if we have at least one customer and one supplier
    IF array_length(customer_ids, 1) > 0 AND array_length(supplier_ids, 1) > 0 THEN
        FOR i IN 1..5 LOOP
            -- Select customer (cycle through available customers)
            customer_id := customer_ids[((i - 1) % array_length(customer_ids, 1)) + 1];
            -- Select supplier (cycle through available suppliers)
            supplier_id := supplier_ids[((i - 1) % array_length(supplier_ids, 1)) + 1];
            
            INSERT INTO transactions (
                transaction_id,
                customer_id,
                supplier_id,
                booking_id,
                amount,
                commission_amount,
                net_amount,
                payment_method,
                payment_status,
                transaction_type,
                description,
                created_at
            ) VALUES (
                'TXN-' || LPAD(i::TEXT, 8, '0'),
                customer_id,
                supplier_id,
                'BK-' || LPAD(i::TEXT, 8, '0'),
                (100 + i * 50)::DECIMAL(10, 2),
                ROUND((100 + i * 50) * 0.15, 2),
                ROUND((100 + i * 50) * 0.85, 2),
                CASE WHEN i % 2 = 0 THEN 'stripe' ELSE 'card' END,
                CASE i
                    WHEN 1 THEN 'completed'
                    WHEN 2 THEN 'completed'
                    WHEN 3 THEN 'pending'
                    WHEN 4 THEN 'completed'
                    ELSE 'failed'
                END,
                'payment',
                CASE i
                    WHEN 1 THEN 'Bin rental payment - General Waste 6m³'
                    WHEN 2 THEN 'Bin rental payment - Green Waste 3m³'
                    WHEN 3 THEN 'Bin rental payment - Builders Waste 10m³'
                    WHEN 4 THEN 'Bin rental payment - Concrete/Dirt 6m³'
                    ELSE 'Bin rental payment - General Waste 3m³'
                END,
                NOW() - (INTERVAL '1 day' * (i - 1))
            ) ON CONFLICT (transaction_id) DO NOTHING;
        END LOOP;
    END IF;
END $$;
