-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'customer', 'supplier')),
    supplier_type VARCHAR(30) CHECK (
        supplier_type IS NULL 
        OR supplier_type IN ('commercial', 'residential', 'commercial_residential')
    ),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Seed a default admin user if none exists
INSERT INTO users (name, phone, email, role, password_hash, created_at, updated_at)
SELECT
    'System Admin' AS name,
    '0123456789' AS phone,
    'admin@example.com' AS email,
    'admin' AS role,
    -- bcrypt hash for password 'Test@123'
    '$2b$10$gyaIpsIS1YQldLxRDRQcG.IOdVmYIxtOYWbYlQ4.zy4eQlFVA1gI6' AS password_hash,
    NOW() AS created_at,
    NOW() AS updated_at
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE role = 'admin'
);