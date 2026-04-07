const pool = require('../config/database');

class Message {
  static async create({ conversationId, senderId, messageText, attachmentUrl }) {
    const query = `
      INSERT INTO messages (conversation_id, sender_id, message_text, attachment_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [conversationId, senderId, messageText || null, attachmentUrl || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByConversationId(conversationId) {
    const query = `
      SELECT m.*, u.name as sender_name 
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE conversation_id = $1 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query, [conversationId]);
    return result.rows;
  }

  static async markAsRead(conversationId, userId) {
    const query = `
      UPDATE messages 
      SET read_at = NOW() 
      WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL
    `;
    await pool.query(query, [conversationId, userId]);
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.read_at IS NULL
        AND m.sender_id != $1
        AND (c.participant1_id = $1 OR c.participant2_id = $1)
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.count || 0;
  }
}

module.exports = Message;
