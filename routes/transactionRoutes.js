const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getTransactionById,
  getTransactionStats,
  updateTransaction,
} = require('../controllers/transactionController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// All transaction routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAllTransactions);
router.get('/stats', getTransactionStats);
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);

module.exports = router;
