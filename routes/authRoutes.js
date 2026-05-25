const express = require('express');
const router = express.Router();
const { signup, login, getMe, updateProfile, updateProfilePhoto, changePassword, updatePushToken, requestDelete } = require('../controllers/authController');
const { validateSignup, validateLogin, validateUpdateProfile, validateChangePassword } = require('../middleware/validation');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validateUpdateProfile, updateProfile);
router.put('/profile/photo', authenticate, upload.single('profilePhoto'), updateProfilePhoto);
router.put('/password', authenticate, validateChangePassword, changePassword);
router.put('/push-token', authenticate, updatePushToken);
router.post('/request-delete', authenticate, requestDelete);

module.exports = router;
