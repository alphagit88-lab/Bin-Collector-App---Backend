const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/authMiddleware');

// Get invoices for the current user
router.get('/invoices', authenticate, billingController.getInvoices);

// Admin: Toggle billing visibility
router.post('/toggle-visibility', authenticate, billingController.toggleBillingVisibility);

module.exports = router;
