-- Add delivery_photo_url to order_items table
-- This stores the per-bin delivery photo uploaded by the driver/supplier
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;

COMMENT ON COLUMN order_items.delivery_photo_url IS 'URL of the photo uploaded as proof of delivery for this specific bin.';
