const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.findByUserId(req.user.id);
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Authorization check
    const conversation = await Conversation.findById(conversationId, req.user.id);
    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view these messages'
      });
    }

    const messages = await Message.findByConversationId(conversationId);
    
    // Mark as read
    await Message.markAsRead(conversationId, req.user.id);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, messageText, attachmentUrl } = req.body;
    
    // Authorization check
    const conversation = await Conversation.findById(conversationId, req.user.id);
    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized in this conversation'
      });
    }

    const message = await Message.create({
      conversationId,
      senderId: req.user.id,
      messageText,
      attachmentUrl
    });

    // Update conversation last activity
    await Conversation.updateLastMessageAt(conversationId);

    // Emit via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      const recipientId = conversation.participant1_id === req.user.id 
        ? conversation.participant2_id 
        : conversation.participant1_id;
      
      io.to(`user_${recipientId}`).emit('new_message', {
        conversationId,
        message
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

exports.startOrderChat = async (req, res) => {
  try {
    const { orderId, recipientId } = req.body;
    if (!orderId || !recipientId) {
      return res.status(400).json({ success: false, message: 'Missing orderId or recipientId' });
    }

    const conversation = await Conversation.findOrCreateOrderConversation(orderId, req.user.id, recipientId);
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error starting order chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start chat'
    });
  }
};

exports.startSupportChat = async (req, res) => {
  try {
    const conversation = await Conversation.findOrCreateSupportConversation(req.user.id);
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error starting support chat:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start support chat'
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user.id);
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error fetching unread message count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread message count'
    });
  }
};
