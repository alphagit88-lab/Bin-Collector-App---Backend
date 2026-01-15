const express = require('express');
const router = express.Router();
const {
  getWallet,
  getWalletTransactions,
  requestPayout,
  getPayouts,
  getAllWallets,
  getAllPayouts,
  updatePayoutStatus,
} = require('../controllers/walletController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, getWallet);
router.get('/transactions', authenticate, getWalletTransactions);
router.post('/payout', authenticate, requestPayout);
router.get('/payouts', authenticate, getPayouts);

// Admin routes
router.get('/admin/wallets', authenticate, requireAdmin, getAllWallets);
router.get('/admin/payouts', authenticate, requireAdmin, getAllPayouts);
router.put('/admin/payouts/:id/status', authenticate, requireAdmin, updatePayoutStatus);

module.exports = router;
