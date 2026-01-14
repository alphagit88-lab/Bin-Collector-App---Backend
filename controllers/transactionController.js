const Transaction = require('../models/Transaction');

const getAllTransactions = async (req, res) => {
  try {
    const {
      payment_status,
      customer_id,
      supplier_id,
      start_date,
      end_date,
      limit,
      offset,
    } = req.query;

    const filters = {};
    if (payment_status) filters.payment_status = payment_status;
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (supplier_id) filters.supplier_id = parseInt(supplier_id);
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const transactions = await Transaction.findAll(filters);

    res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message,
    });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction',
      error: error.message,
    });
  }
};

const getTransactionStats = async (req, res) => {
  try {
    const stats = await Transaction.getStats();
    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction stats',
      error: error.message,
    });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, description, metadata } = req.body;

    const transaction = await Transaction.update(id, {
      payment_status,
      description,
      metadata,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction },
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction',
      error: error.message,
    });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  getTransactionStats,
  updateTransaction,
};
