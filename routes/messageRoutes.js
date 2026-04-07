const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/conversations', authenticate, messageController.getConversations);
router.get('/unread-count', authenticate, messageController.getUnreadCount);
router.get('/conversations/:conversationId/messages', authenticate, messageController.getMessages);
router.post('/messages', authenticate, messageController.sendMessage);
router.post('/start-order-chat', authenticate, messageController.startOrderChat);
router.post('/start-support-chat', authenticate, messageController.startSupportChat);

module.exports = router;
