-- Migration 012: Backfill invoice_id in service_requests from invoices table

-- Update service_requests with invoice_id from invoices table where invoice_id is null
UPDATE service_requests sr
SET invoice_id = i.invoice_id
FROM invoices i
WHERE sr.id = i.service_request_id
  AND sr.invoice_id IS NULL;
