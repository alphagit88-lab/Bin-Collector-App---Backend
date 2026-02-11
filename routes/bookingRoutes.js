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
  getOrderItems,
  markReadyToPickup,
  getAllServiceRequests,
} = require('../controllers/bookingController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

const upload = require('../utils/upload');

// Customer routes
router.post('/', authenticate, upload.single('attachment'), createServiceRequest);
router.get('/my-requests', authenticate, getMyRequests);
router.get('/:id', authenticate, getRequestById);
router.get('/:id/order-items', authenticate, getOrderItems);
router.put('/:id/ready-to-pickup', authenticate, markReadyToPickup);

// Supplier routes
router.get('/supplier/requests', authenticate, getSupplierRequests);
router.get('/supplier/pending', authenticate, getPendingRequests);
router.post('/:id/accept', authenticate, acceptRequest);
router.put('/:id/status', authenticate, updateRequestStatus);
router.get('/:id/order-items', authenticate, getOrderItems);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, getAllServiceRequests);

module.exports = router;
