const Invoice = require('../models/Invoice');

// Get all invoices (admin)
const getAllInvoices = async (req, res) => {
  try {
    const { payment_status, payment_method, customer_id, supplier_id, limit } = req.query;

    const filters = {};
    if (payment_status) filters.payment_status = payment_status;
    if (payment_method) filters.payment_method = payment_method;
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (supplier_id) filters.supplier_id = parseInt(supplier_id);
    if (limit) filters.limit = parseInt(limit);

    const invoices = await Invoice.findAll(filters);

    res.json({
      success: true,
      data: { invoices },
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

// Get invoice by ID
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

    res.json({
      success: true,
      data: { invoice },
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

// Get invoice by invoice_id
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

    // Optional: Fetch payout details if needed
    let payout = null;
    if (invoice.payout_id) {
      const pool = require('../config/database');
      const result = await pool.query('SELECT * FROM payouts WHERE id = $1', [invoice.payout_id]);
      payout = result.rows[0];
    }

    res.json({
      success: true,
      data: {
        invoice,
        payout
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
