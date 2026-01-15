const express = require('express');
const router = express.Router();
const {
  submitQuote,
  getQuotesByRequest,
  acceptQuote,
  getAllQuotes,
} = require('../controllers/quoteController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.post('/', authenticate, submitQuote);
router.get('/request/:request_id', authenticate, getQuotesByRequest);
router.post('/:id/accept', authenticate, acceptQuote);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, getAllQuotes);

module.exports = router;
