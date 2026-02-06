const express = require('express');
const router = express.Router();
const {
    getAllBills,
    getBillById,
    getBillByBillId,
} = require('../controllers/billController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// All bill routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAllBills);
router.get('/by-bill-id/:billId', getBillByBillId);
router.get('/:id', getBillById);

module.exports = router;
