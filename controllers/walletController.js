const SupplierWallet = require('../models/SupplierWallet');

// Get wallet balance
const getWallet = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const wallet = await SupplierWallet.getOrCreate(supplierId);

    res.json({
      success: true,
      data: { wallet },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallet',
      error: error.message,
    });
  }
};

// Get wallet transactions
const getWalletTransactions = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const wallet = await SupplierWallet.getOrCreate(supplierId);
    const transactions = await SupplierWallet.getTransactions(wallet.id);

    res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message,
    });
  }
};

// Get pending jobs available for payout (credits not yet in a payout request)
const getPendingPayoutJobs = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const wallet = await SupplierWallet.getOrCreate(supplierId);
    const jobs = await SupplierWallet.getPendingPayoutJobs(wallet.id);

    res.json({
      success: true,
      data: { pending_jobs: jobs },
    });
  } catch (error) {
    console.error('Get pending payout jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending payout jobs',
      error: error.message,
    });
  }
};

// Request payout (body: wallet_transaction_ids array, payment_method, bank_details)
const requestPayout = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { wallet_transaction_ids, payment_method, bank_details } = req.body;

    const wallet = await SupplierWallet.getOrCreate(supplierId);

    const ids = Array.isArray(wallet_transaction_ids)
      ? wallet_transaction_ids.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n))
      : [];

    const payout = await SupplierWallet.requestPayout(
      wallet.id,
      ids,
      payment_method || 'bank_transfer',
      bank_details
    );

    res.status(201).json({
      success: true,
      message: 'Payout request submitted successfully',
      data: { payout },
    });
  } catch (error) {
    console.error('Request payout error:', error);
    const status = error.message && (error.message.includes('not found') || error.message.includes('Select at least') || error.message.includes('do not belong') || error.message.includes('already included') || error.message.includes('Only completed')) ? 400 : 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Error requesting payout',
      error: error.message,
    });
  }
};

// Get payouts
const getPayouts = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const payouts = await SupplierWallet.getPayouts(supplierId);

    res.json({
      success: true,
      data: { payouts },
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payouts',
      error: error.message,
    });
  }
};

// Admin: Get all wallets
const getAllWallets = async (req, res) => {
  try {
    const wallets = await SupplierWallet.findAllWallets();
    const Transaction = require('../models/Transaction');
    const stats = await Transaction.getStats();

    res.json({
      success: true,
      data: {
        wallets,
        stats
      },
    });
  } catch (error) {
    console.error('Get all wallets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wallets',
      error: error.message,
    });
  }
};

// Admin: Get all payouts
const getAllPayouts = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const payouts = await SupplierWallet.findAllPayouts({
      status,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      data: { payouts },
    });
  } catch (error) {
    console.error('Get all payouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payouts',
      error: error.message,
    });
  }
};

// Admin: Update payout status
const updatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved, rejected, or pending',
      });
    }

    const payout = await SupplierWallet.updatePayoutStatus(id, status, admin_notes);

    res.json({
      success: true,
      message: `Payout ${status} successfully`,
      data: { payout },
    });
  } catch (error) {
    console.error('Update payout status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payout status',
      error: error.message,
    });
  }
};

module.exports = {
  getWallet,
  getWalletTransactions,
  getPendingPayoutJobs,
  requestPayout,
  getPayouts,
  getAllWallets,
  getAllPayouts,
  updatePayoutStatus,
};
