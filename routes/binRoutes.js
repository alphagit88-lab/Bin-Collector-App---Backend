const express = require('express');
const router = express.Router();
const {
  getAllBinTypes,
  getBinTypeById,
  createBinType,
  updateBinType,
  deleteBinType,
  getAllBinSizes,
  getBinSizeById,
  createBinSize,
  updateBinSize,
  deleteBinSize,
} = require('../controllers/binController');
const {
  getAllBins,
  getBinById,
  getBinByCode,
  createBin,
  updateBin,
  deleteBin,
  assignBinToSupplier,
} = require('../controllers/physicalBinController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Public routes (for future mobile app)
router.get('/types', getAllBinTypes);
router.get('/types/:id', getBinTypeById);
router.get('/sizes', getAllBinSizes);
router.get('/sizes/:id', getBinSizeById);

// Physical bins routes (authenticated users - suppliers and admins)
// Suppliers can view/create/update their own bins, admins can do everything
router.get('/physical', authenticate, getAllBins);
router.get('/physical/code/:code', authenticate, getBinByCode);
router.get('/physical/:id', authenticate, getBinById);
router.post('/physical', authenticate, createBin); // Both admin and supplier can create
router.put('/physical/:id', authenticate, updateBin);
router.put('/physical/:id/assign', authenticate, requireAdmin, assignBinToSupplier);
router.delete('/physical/:id', authenticate, requireAdmin, deleteBin);

// Admin-only routes (bin types and sizes management)
router.use(authenticate);
router.use(requireAdmin);

router.post('/types', createBinType);
router.put('/types/:id', updateBinType);
router.delete('/types/:id', deleteBinType);
router.post('/sizes', createBinSize);
router.put('/sizes/:id', updateBinSize);
router.delete('/sizes/:id', deleteBinSize);

module.exports = router;
