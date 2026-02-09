const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { verifyToken, verifyRole, verifyAdmin } = require('../middleware/authMiddleware');

// Get supplier availability
router.get('/availability', verifyToken, verifyRole(['supplier', 'admin']), supplierController.getAvailability);

// Update supplier availability
router.post('/availability', verifyToken, verifyRole(['supplier', 'admin']), supplierController.updateAvailability);

// Service Areas
router.get('/service-areas', verifyToken, verifyRole(['supplier', 'admin']), supplierController.getServiceAreas);
router.post('/service-areas', verifyToken, verifyRole(['supplier', 'admin']), supplierController.createServiceArea);
router.delete('/service-areas/:id', verifyToken, verifyRole(['supplier', 'admin']), supplierController.deleteServiceArea);

module.exports = router;
