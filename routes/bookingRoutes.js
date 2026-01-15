const express = require('express');
const router = express.Router();
const {
  createServiceRequest,
  getMyRequests,
  getSupplierRequests,
  getPendingRequests,
  getRequestById,
  acceptRequest,
  updateRequestStatus,
  processPayment,
  getAllServiceRequests,
} = require('../controllers/bookingController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Customer routes
router.post('/', authenticate, createServiceRequest);
router.get('/my-requests', authenticate, getMyRequests);
router.get('/:id', authenticate, getRequestById);
router.post('/:id/payment', authenticate, processPayment);

// Supplier routes
router.get('/supplier/requests', authenticate, getSupplierRequests);
router.get('/supplier/pending', authenticate, getPendingRequests);
router.post('/:id/accept', authenticate, acceptRequest);
router.put('/:id/status', authenticate, updateRequestStatus);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, getAllServiceRequests);

module.exports = router;
