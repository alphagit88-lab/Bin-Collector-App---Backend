const express = require('express');
const router = express.Router();
const {
  getAllProvinceGST,
  getProvinceGSTByCode,
  updateProvinceGST,
  createProvinceGST,
  deleteProvinceGST,
} = require('../controllers/provinceGSTController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllProvinceGST);
router.get('/:provinceCode', getProvinceGSTByCode);

// Routes requiring authentication and admin
router.use(authenticate, requireAdmin);
router.post('/', createProvinceGST);
router.put('/:provinceCode', updateProvinceGST);
router.delete('/:provinceCode', deleteProvinceGST);

module.exports = router;
