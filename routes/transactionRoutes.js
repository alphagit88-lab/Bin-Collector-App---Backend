const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getTransactionById,
  getTransactionStats,
  updateTransaction,
  getMyTransactions,
} = require('../controllers/transactionController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Customer/Supplier routes (authenticated users can view their own transactions)
router.get('/my', authenticate, getMyTransactions);

// Admin-only routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAllTransactions);
router.get('/stats', getTransactionStats);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);

module.exports = router;
