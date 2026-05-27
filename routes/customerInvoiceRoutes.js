const express = require('express');
const router = express.Router();
const {
  getAllCustomerInvoices,
  getCommercialOrders,
  getCustomerInvoiceById,
  generateCustomerInvoiceFromOrder,
} = require('../controllers/customerInvoiceController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, requireAdmin, getAllCustomerInvoices);
router.get('/commercial-orders', authenticate, requireAdmin, getCommercialOrders);
router.get('/:id', authenticate, requireAdmin, getCustomerInvoiceById);
router.post('/generate-from-order', authenticate, requireAdmin, generateCustomerInvoiceFromOrder);

module.exports = router;
