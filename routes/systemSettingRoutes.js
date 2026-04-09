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

// Public route for public settings
router.get('/public/:key', async (req, res) => {
  const SystemSetting = require('../models/SystemSetting');
  try {
    const setting = await SystemSetting.findByKey(req.params.key);
    if (!setting || !setting.is_public) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, data: { setting } });
  } catch(error) {
     res.status(500).json({ success: false, error: error.message });
  }
});

// All system setting routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/', getAllSettings);
router.get('/:key', getSettingByKey);
router.post('/', createSetting);
router.put('/:key', updateSetting);
router.delete('/:key', deleteSetting);

module.exports = router;
