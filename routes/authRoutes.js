const express = require('express');
const router = express.Router();
const { signup, login, getMe, updateProfile, changePassword, updatePushToken } = require('../controllers/authController');
const { validateSignup, validateLogin, validateUpdateProfile, validateChangePassword } = require('../middleware/validation');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/signup', validateSignup, signup);
router.post('/login', validateLogin, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validateUpdateProfile, updateProfile);
router.put('/password', authenticate, validateChangePassword, changePassword);
router.put('/push-token', authenticate, updatePushToken);

module.exports = router;
