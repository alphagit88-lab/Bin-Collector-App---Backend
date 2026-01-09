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
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Public routes (for future mobile app)
router.get('/types', getAllBinTypes);
router.get('/types/:id', getBinTypeById);
router.get('/sizes', getAllBinSizes);
router.get('/sizes/:id', getBinSizeById);

// Admin-only routes
router.use(authenticate);
router.use(requireAdmin);

router.post('/types', createBinType);
router.put('/types/:id', updateBinType);
router.delete('/types/:id', deleteBinType);
router.post('/sizes', createBinSize);
router.put('/sizes/:id', updateBinSize);
router.delete('/sizes/:id', deleteBinSize);

module.exports = router;
