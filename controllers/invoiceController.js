const Invoice = require('../models/Invoice');
const SupplierWallet = require('../models/SupplierWallet');
const { parsePagination, paginationMeta, extractWindowTotal, stripWindowTotal } = require('../utils/pagination');

// Get all invoices (admin)
const getAllInvoices = async (req, res) => {
  try {
    const { payment_status, payment_method, customer_id, supplier_id, startDate, endDate } = req.query;
    const pagination = parsePagination(req.query);

    const filters = {};
    if (payment_status) filters.payment_status = payment_status;
    if (payment_method) filters.payment_method = payment_method;
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (supplier_id) filters.supplier_id = parseInt(supplier_id);
    filters.startDate = startDate;
    filters.endDate = endDate;
    filters.limit = pagination.limit;
    filters.offset = pagination.offset;

    const rows = await Invoice.findAll(filters);
    const total = extractWindowTotal(rows);
    const invoices = stripWindowTotal(rows);

    res.json({
      success: true,
      data: { invoices, ...(pagination.requested ? { pagination: paginationMeta(pagination.page, pagination.limit, total) } : {}) },
    });
  } catch (error) {
    console.error('Get all invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message,
    });
  }
};

// Get invoice by ID (includes line items for payout invoices)
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    let line_items = [];
    if (invoice.payout_id) {
      line_items = await SupplierWallet.getPayoutItems(invoice.payout_id);
    }

    res.json({
      success: true,
      data: { invoice, line_items },
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message,
    });
  }
};

// Get invoice by invoice_id (includes payout and line items - jobs - for payout invoices)
const getInvoiceByInvoiceId = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findByInvoiceId(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    let payout = null;
    let line_items = [];
    if (invoice.payout_id) {
      const pool = require('../config/database');
      const result = await pool.query('SELECT * FROM payouts WHERE id = $1', [invoice.payout_id]);
      payout = result.rows[0];
      line_items = await SupplierWallet.getPayoutItems(invoice.payout_id);
    }

    res.json({
      success: true,
      data: {
        invoice,
        payout,
        line_items,
      },
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message,
    });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByInvoiceId,
};
