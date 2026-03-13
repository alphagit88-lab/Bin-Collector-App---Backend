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

// Bin Pricing Setup
router.get('/bin-sizes', verifyToken, verifyRole(['supplier', 'admin']), supplierController.getBinSizes);
router.get('/service-areas/:id/bins', verifyToken, verifyRole(['supplier', 'admin']), supplierController.getServiceAreaBins);
router.post('/service-area-bins/price', verifyToken, verifyRole(['supplier', 'admin']), supplierController.updateServiceAreaBinPrice);

// Driver Management
router.get('/drivers', verifyToken, verifyRole(['supplier', 'admin']), supplierController.getDrivers);
router.post('/drivers', verifyToken, verifyRole(['supplier', 'admin']), supplierController.addDriver);
router.post('/assign-driver', verifyToken, verifyRole(['supplier', 'admin']), supplierController.assignDriver);

module.exports = router;
