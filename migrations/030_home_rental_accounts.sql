CREATE TABLE IF NOT EXISTS home_rental_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    app_role VARCHAR(20) NOT NULL CHECK (app_role IN ('tenant', 'owner')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_home_rental_accounts_email_lower
ON home_rental_accounts (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_home_rental_accounts_user_id
ON home_rental_accounts (user_id);

COMMENT ON TABLE home_rental_accounts IS 'Email-based auth for the Home Rental app without changing legacy auth tables.';
