-- Add GST columns to service_requests table
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(10, 2) DEFAULT 0.00;
