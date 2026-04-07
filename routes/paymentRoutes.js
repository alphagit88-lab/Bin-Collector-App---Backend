const express = require('express');
const router = express.Router();
const { createPaymentIntent, stripeWebhook, confirmPaymentSuccess } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');

// Stripe webhook (must use raw body). See backend/index.js for raw-body middleware.
router.post('/webhook', stripeWebhook);

router.post('/create-intent', authenticate, createPaymentIntent);
router.post('/confirm-success', authenticate, confirmPaymentSuccess);

module.exports = router;
