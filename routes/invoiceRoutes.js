const express = require('express');
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  getInvoiceByInvoiceId,
} = require('../controllers/invoiceController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// All invoice routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAllInvoices);
router.get('/by-invoice/:invoiceId', getInvoiceByInvoiceId);
router.get('/:id', getInvoiceById);

module.exports = router;
