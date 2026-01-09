const express = require('express');
const router = express.Router();
const {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
} = require('../controllers/systemSettingController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// All system setting routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAllSettings);
router.get('/:key', getSettingByKey);
router.post('/', createSetting);
router.put('/:key', updateSetting);
router.delete('/:key', deleteSetting);

module.exports = router;
